import * as deepstream from 'deepstream.io-client-js';
import * as r from 'rethinkdb';
import { connect, Connection, Db } from 'rethinkdb';
import { ensureDbsExist, ensureTablesExist } from '../../common/db/util';
import TaskSet from '../../common/recipes/TaskSet';
import { JobChangeNotification, Recipe } from '../../common/types/api';
import { RunState } from '../../common/types/api';
import { JobRecord, TaskRecord } from '../../common/types/queue';
import { JobControl, Queue } from '../../queue';
import K8 from './K8';
import { logger } from './logger';

// TODO: This could be much better. (Escape chars, etc.)
function quoteArg(arg: string): string {
  if (/[\s\"]/.exec(arg)) {
    return `"${arg}"`;
  }
  return arg;
}

export default class Scheduler {
  private jobQueue: Queue<JobRecord>;
  private taskQueue: Queue<TaskRecord>;
  private conn: Connection;
  private db: any;
  private deepstream: deepstreamIO.Client;
  private k8: K8;
  private ready: Promise<void>;

  private shortInterval: number = 100; // 100ms
  private mediumInterval: number = 3000; // 3 seconds
  private longInterval: number = 1000 * 60 * 60; // One hour

  constructor() {
    this.deepstream = deepstream(
      `${process.env.DEEPSTREAM_SERVICE_HOST}:${process.env.DEEPSTREAM_SERVICE_PORT}`).login();
    const interval = parseInt(process.env.QUEUE_MASTER_INTERVAL, 10);
    logger.info(`Rethinkdb service host: ${process.env.RETHINKDB_PROXY_SERVICE_HOST}:` +
        `${process.env.RETHINKDB_PROXY_SERVICE_PORT}.`);
    logger.info(`Connecting to job queue ${process.env.DB_NAME}:${process.env.JOB_QUEUE_NAME}.`);

    this.ready = connect({
      host: process.env.RETHINKDB_PROXY_SERVICE_HOST,
      port: process.env.RETHINKDB_PROXY_SERVICE_PORT,
    }).then((conn: Connection) => {
      this.conn = conn;
      return ensureDbsExist(this.conn, [process.env.DB_NAME]);
    }).then(() => {
      this.jobQueue = new Queue<JobRecord>(this.conn, {
        db: process.env.DB_NAME,
        name: process.env.JOB_QUEUE_NAME,
        // masterInterval: interval,
      });
      logger.info(`Connecting to job queue ${process.env.DB_NAME}:${process.env.TASK_QUEUE_NAME}.`);
      this.taskQueue = new Queue<TaskRecord>(this.conn, {
        db: process.env.DB_NAME,
        name: process.env.TASK_QUEUE_NAME,
        // masterInterval: interval,
      });
      return Promise.all([
        this.jobQueue.ready,
        this.taskQueue.ready,
      ]);
    }).then(() => {
      this.db = r.db(process.env.DB_NAME);
      this.k8 = new K8();
      logger.level = 'debug';

      this.emitJobUpdate = this.emitJobUpdate.bind(this);
      this.emitTaskUpdate = this.emitTaskUpdate.bind(this);

      // TODO: Move this to the 'run' method, assuming we can figure out how to stop it.
      const startWatching = () => {
        // Re-send the request if the stream ends.
        logger.debug('Watching status changes.');
        this.k8.watchJobs(this.handleK8Message.bind(this), startWatching);
      };
      startWatching();
    }, error => {
      logger.error(error);
    });
  }

  public run() {
    // Job Queue processing loop.
    this.ready.then(() => {
      this.jobQueue.process((job, jobControl) => {
        // logger.debug(`Processing Job: ${job.id} [${RunState[job.state]}].`);
        if (job.state === RunState.RUNNING) {
          if (!job.tasksCreated) {
            this.evalRecipe(job, jobControl);
          } else {
            this.updateJobStatus(job, jobControl);
          }
        } else if (job.state === RunState.CANCELLING) {
          this.updateJobStatus(job, jobControl);
        }
      });

      // Task Queue processing loop.
      this.taskQueue.process((task, taskControl) => {
        // logger.debug(`Processing Task: ${task.jobId}:${task.taskId} [${RunState[task.state]}].`);
        if (task.state === RunState.RUNNING) {
          if (!task.workStarted) {
            this.beginTask(task, taskControl);
          } else {
            this.updateTaskStatus(task, taskControl);
          }
        } else if (task.state === RunState.CANCELLING) {
          taskControl.cancel().then(() => {
            this.jobQueue.wake(task.jobId, 1000);
          });
        }
      });
    });
  }

  private evalRecipe(job: JobRecord, jobControl: JobControl<JobRecord>): void {
    logger.info(`Job ${job.id} executing recipe [${job.recipe}].`);
    jobControl.log.info(`Executing recipe [${job.recipe}].`);
    jobControl.update({ tasksCreated: true, concurrencyLimit: 5 });
    this.db.table('Recipes').get(job.recipe).run(this.conn).then((recipe: any) => {
      if (!recipe) {
        logger.error(`Job ${job.id} failed, recipe ${job.recipe} not found.`);
        jobControl.log.error(`Recipe [${job.recipe}] not found.`);
        jobControl.fail().then(this.emitJobUpdate);
      } else {
        // Create tasks for this job
        // Note that the following method modifies the job object.
        this.createRecipeTasks(job, jobControl, recipe).then(() => {
          jobControl.log.info(`Created tasks from recipe [${job.recipe}].`);
          // Tasks have been added, but are in the 'ready' state; reschedule the job immediately
          // so that we can start running them.
          jobControl.setState(RunState.RUNNING)
            .update({
              runningTasks: job.runningTasks,
              waitingTasks: job.waitingTasks,
            }).reschedule(this.shortInterval)
            .then(this.emitJobUpdate);
        }, error => {
          logger.error(`Job ${job.id} failed creating tasks: ${error.message}`);
          jobControl.log.error(`Failed to create recipe tasks: $(error.message}`);
          jobControl.fail(error).then(this.emitJobUpdate);
        });
      }
    });
  }

  private createRecipeTasks(job: JobRecord, jobControl: JobControl<JobRecord>, recipe: Recipe) {
    logger.info(`Creating recipe tasks for job ${job.id}, recipe ${job.recipe}.`);
    const taskSet = new TaskSet(recipe);
    taskSet.setUserArgs(job.submissionParams);
    try {
      taskSet.createTasks();
    } catch (e) {
      return Promise.reject(e);
    }
    const readyTasks = [];
    const eternity = new Date(Date.now() + this.longInterval);
    let index = 0;
    for (const task of taskSet.taskList) {
      logger.info(`Creating new task: ${job.id}:${task.taskId}.`);
      const taskRecord = this.taskQueue.create({
        ...task,
        jobId: job.id,
        index: index++,
        state: task.depends.length === 0 && job.runningTasks.length < job.concurrencyLimit ?
            RunState.READY : RunState.WAITING,
      });
      readyTasks.push(taskRecord);
      if (taskRecord.state === RunState.READY) {
        job.runningTasks.push(task.taskId);
      } else {
        job.waitingTasks.push(task.taskId);
      }
    }

    // Add all the tasks to the task queue
    return this.taskQueue.addJob(readyTasks);
  }

  private updateJobStatus(job: JobRecord, jobControl: JobControl<JobRecord>) {
    logger.debug(`Updating job status: ${job.id} [${RunState[job.state]}]`);
    const later = new Date(Date.now() + this.longInterval);
    let workTotal = 0;
    let workCompleted = 0;
    let workFailed = 0;
    const waitingTasks: string[] = [];
    const runningTasks: string[] = [];
    const cancelledTasks: string[] = [];
    const completedTasks: string[] = [];
    const failedTasks: string[] = [];
    const taskIdMap: { [key: string]: TaskRecord } = {};
    const taskChangedMap: { [key: string]: TaskRecord } = {};
    return this.taskQueue.find({ jobId: job.id }).then(tasks => {
      // Build a map of all tasks by task id.
      for (const task of tasks) {
        taskIdMap[task.taskId] = task;
      }
      // Now update the dependency status of all tasks.
      for (const task of tasks) {
        workTotal += task.weight || 0;
        const depCounts = {
          [RunState.WAITING]: 0,
          [RunState.READY]: 0,
          [RunState.RUNNING]: 0,
          [RunState.CANCELLING]: 0,
          [RunState.CANCELLED]: 0,
          [RunState.COMPLETED]: 0,
          [RunState.FAILED]: 0,
        };
        // For this task, summarize the state of its dependencies
        for (const depId of task.depends) {
          const dep = taskIdMap[depId];
          depCounts[dep ? dep.state : RunState.FAILED] += 1;
        }
        const taskControl = this.taskQueue.getControl(task);
        switch (task.state) {
          case RunState.WAITING:
            if (job.state === RunState.CANCELLING) {
              this.cancelTask(task, taskControl, jobControl);
              cancelledTasks.push(task.id);
              taskChangedMap[task.taskId] = task;
            } else if (depCounts[RunState.CANCELLING] > 0 || depCounts[RunState.CANCELLED] > 0) {
              // If any of our dependenies are cancelled, then this is too.
              logger.warn(`Task ${task.jobId}:${task.taskId} cancelled because ` +
                  'it depends on a task which was also cancelled.');
              taskControl.log.warning('Task cancelled because a task it depends on was cancelled.');
              jobControl.log.warning(
                  `Task '${task.taskId}' cancelled because a task it depends on was cancelled.`);
              taskControl.cancel();
              cancelledTasks.push(task.id);
              taskChangedMap[task.taskId] = task;
            } else if (depCounts[RunState.FAILED] > 0) {
              // If any of our dependenies are failed, then this task is too.
              logger.warn(`Task ${task.jobId}:${task.taskId} failed`,
                  'because it depends on a task which also failed.');
              taskControl.log.warning('Task failed because a task it depends on failed.');
              jobControl.log.warning(
                  `Task '${task.taskId}' failed because a task it depends on failed.`);
              // console.log('dep counts:', depCounts);
              taskControl.fail();
              failedTasks.push(task.id);
              workFailed += task.weight;
              taskChangedMap[task.taskId] = task;
            } else if (depCounts[RunState.COMPLETED] === task.depends.length &&
                runningTasks.length < job.concurrencyLimit) {
              // All dependencies completed.
              logger.info(`Task ${task.jobId}:${task.taskId} dependencies satsfied.`);
              taskControl.log.info('Task dependencies satisfied; task is ready to run.');
              jobControl.log.info(`Task '${task.taskId}' dependencies satisfied, task is ready.`);
              taskControl.setState(RunState.READY).reschedule(this.shortInterval);
              runningTasks.push(task.id);
              taskChangedMap[task.taskId] = task;
            } else {
              waitingTasks.push(task.id);
            }
            break;
          case RunState.READY:
          case RunState.RUNNING:
            if (job.state === RunState.CANCELLING) {
              this.cancelTask(task, taskControl, jobControl);
              cancelledTasks.push(task.id);
              taskChangedMap[task.taskId] = task;
            } else {
              // Ready tasks are considerd running for purposes of determining overall job state.
              runningTasks.push(task.id);
            }
            break;
          case RunState.CANCELLING:
            // Tasks which are in the process of cancelling are treated as running for purposes
            // of determining whether the job is finished or not.
            runningTasks.push(task.id);
            break;
          case RunState.CANCELLED:
            cancelledTasks.push(task.id);
            break;
          case RunState.COMPLETED:
            workCompleted += task.weight || 0;
            completedTasks.push(task.id);
            break;
          case RunState.FAILED:
            workFailed += task.weight || 0;
            failedTasks.push(task.id);
            break;
        }
      }

      jobControl.update({
        workTotal,
        workCompleted,
        workFailed,
        waitingTasks,
        runningTasks,
        cancelledTasks,
        completedTasks,
        failedTasks,
      });
      if (job.state === RunState.FAILED || job.state === RunState.CANCELLED) {
        // Don't change state again, just commit the changes we made.
        jobControl.end();
      } else if (job.failedTasks.length > 0) {
        if (job.waitingTasks.length === 0 && job.runningTasks.length === 0) {
          logger.warn(`Job ${job.id} has ${failedTasks.length} failing tasks`,
              'and no running tasks.');
          logger.error(`Setting job ${job.id} state to [FAILED].`);
          jobControl.log.warning(
              `Job has ${failedTasks.length} failing tasks and no running tasks.`);
          jobControl.fail();
        } else {
          logger.info(`Job ${job.id} has ${failedTasks.length} failing tasks `,
              `and ${waitingTasks.length + runningTasks.length} running tasks.`);
          logger.info(`Waiting for ${job.id} tasks to finish.`);
          jobControl.log.info('Waiting for tasks to finish...');
          jobControl.reschedule(this.mediumInterval);
        }
      } else if (job.cancelledTasks.length > 0) {
        if (job.waitingTasks.length === 0 && job.runningTasks.length === 0) {
          jobControl.log.info('All tasks complete, setting status to cancelled.');
          jobControl.cancel();
        } else {
          jobControl.log.info('Some tasks cancelled, job still waiting on tasks:');
          // jobControl.log.info(`Waiting: ${job.waitingTasks.length}`);
          // jobControl.log.info(`Waiting: ${job.runningTasks.length}`);
          jobControl.reschedule(this.mediumInterval);
        }
      } else if (job.runningTasks.length === 0 && job.waitingTasks.length === 0) {
        jobControl.log.info('Job completed.');
        jobControl.finish();
      } else {
        // Still running
        // jobControl.log.info('Job still waiting on tasks:');
        // jobControl.log.info(`Waiting: ${job.waitingTasks.length}`);
        // jobControl.log.info(`Waiting: ${job.runningTasks.length}`);
        jobControl.reschedule(this.longInterval);
      }
      // TODO: Can we avoid this if nothing changed?
      this.emitJobUpdate(job);
      const tasksChanged = Object.getOwnPropertyNames(taskChangedMap);
      if (tasksChanged.length > 0) {
        logger.verbose(`${tasksChanged.length} tasks updated.`);
        this.notifyTaskChange(job.id, {
          tasksUpdated: tasksChanged.map(id => TaskRecord.serialize(taskChangedMap[id])),
        });
      }
    }, error => {
      jobControl.fail(error).then(this.emitJobUpdate);
    });
  }

  private beginTask(task: TaskRecord, taskControl: JobControl<TaskRecord>) {
    taskControl.update({ workStarted: true });
    if (task.image) {
      this.k8.create(task).then(resp => {
        logger.info(`Task ${task.jobId}:${task.taskId} worker started.`);
        taskControl.log.info('Task worker started.');
        taskControl.log.info(`Image: [${task.image}]`);
        taskControl.log.info(`Command arguments: [${task.args.map(quoteArg).join(' ')}]`);
        this.jobQueue.addLog(task.jobId, 'info', `Task [${task.taskId}] worker started.`);
        // console.log('k8 initial status:', resp.data.status);
        taskControl.setState(RunState.RUNNING).update({
          k8Link: resp.data.metadata.selfLink,
        }).reschedule(this.mediumInterval).then(this.emitTaskUpdate);
        this.jobQueue.wake(task.jobId, this.shortInterval);
      }, error => {
        if (error.response && error.response.data) {
          taskControl.log.error(error.response.data.message);
          this.jobQueue.addLog(task.jobId, 'error', `Task [${task.taskId}] failed.`);
          logger.error(`Task ${task.jobId}:${task.taskId} failed to run K8 image:`,
              error.response.status,
              error.response.data.message);
        } else {
          logger.error(`Task ${task.jobId}:${task.taskId} failed to run K8 image.`);
          // TODO: Handle other kinds of errors.
        }
        taskControl.fail(error).then(this.emitTaskUpdate);
        this.jobQueue.wake(task.jobId, this.shortInterval);
      });
    } else {
      // console.log(task);
      // Task has no image, must have some other action specified.
      logger.error(`Task ${task.jobId}:${task.taskId} is missing an action.`);
      taskControl.log.error('Task has no action specified.');
      this.jobQueue.addLog(task.jobId, 'error', `Task [${task.taskId}] failed.`);
      taskControl.fail().then(this.emitTaskUpdate);
      this.jobQueue.wake(task.jobId, this.shortInterval);
    }
  }

  private updateTaskStatus(task: TaskRecord, taskControl: JobControl<TaskRecord>) {
    logger.debug(
        `Updating status for Task: ${task.jobId}:${task.taskId} [${RunState[task.state]}].`);
    if (task.k8Link) {
      this.k8.getJobStatus(task).then(resp => {
        if (resp.status.succeeded) {
          this.onWorkerSucceeded(task, taskControl);
        } else if (resp.status.failed > 0) {
          this.onWorkerFailed(task, taskControl);
        } else {
          this.k8.getPodStatus(resp.metadata.name).then(pod => {
            if (!this.checkPodStatus(pod, taskControl)) {
              taskControl.reschedule(this.longInterval);
            }
          });
          // More work to do, wait...
        }
      }, error => {
        logger.info(`Task ${task.jobId}:${task.taskId} failed to query K8 status.`);
        taskControl.log.error(`Failed to query worker task status: ${error.message}`);
        // logger.error('Failed to query K8 job status:', error.response);
        // TODO: If this fails several times, go to failing.
        taskControl.reschedule(this.mediumInterval);
      });
    } else {
      logger.warn(`Task ${task.jobId}:${task.taskId} is running but has no action specified.`);
      taskControl.log.error('Task has no action specified. Cancelling.');
      taskControl.fail().then(() => {
        this.notifyTaskChange(task.jobId, { tasksUpdated: [TaskRecord.serialize(task)] });
        return this.jobQueue.wake(task.jobId, this.shortInterval);
      });
    }
  }

  private cancelTask(
      task: TaskRecord, taskControl: JobControl<TaskRecord>, jobControl: JobControl<JobRecord>) {
    logger.warn(`Task ${task.jobId}:${task.taskId} cancelled.`);
    taskControl.log.warning('Task cancelled.');
    jobControl.log.warning(`Task '${task.taskId}' cancelled.`);
    taskControl.cancel();
  }

  private handleK8Message(message: any) {
    // logger.debug(`Got K8 message: ${message.type}.`);
    const jobMessage = message.object;
    const jobId = jobMessage.metadata.labels['factory.job'];
    const taskId = jobMessage.metadata.labels['factory.task'];
    this.taskQueue.find({ jobId, taskId }).then((tasks: TaskRecord[]) => {
      if (tasks.length >= 1) {
        const task = tasks[0];
        if (task.state === RunState.FAILED ||
            task.state === RunState.CANCELLED ||
            task.state === RunState.COMPLETED) {
          return;
        }

        const taskControl = this.taskQueue.getControl(task);
        if (message.type === 'DELETED') {
          // Task was deleted, may have been successful or not.
          logger.info(`Task ${jobId}:${taskId} [${RunState[task.state]}] signaled deleted.`);
          taskControl.log.error('Worker task signaled deleted.');
          if (task.state === RunState.CANCELLING) {
            taskControl.cancel();
          } else {
            taskControl.finish();
          }
          return;
        }

        if (jobMessage.status.failed > 0) {
          this.onWorkerFailed(task, taskControl);
        } else if (this.isComplete(jobMessage)) {
          this.onWorkerSucceeded(task, taskControl);
        } else {
          // console.log('job message:', JSON.stringify(jobMessage, null, 2));
          // logger.debug(`Querying Pod state for task ${jobId}:${taskId}.`);
          this.k8.getPodStatus(jobMessage.metadata.name).then(pod => {
            this.checkPodStatus(pod, taskControl);
          });
          // logger.verbose(JSON.stringify(jobMessage.metadata.name, null, 2));
        }
      } else if (message.type !== 'DELETED') {
        logger.warn(`Handling K8 status: task ${jobId}:${taskId} not found.`, tasks.length);
      }
    });
  }

  private async onWorkerSucceeded(task: TaskRecord, taskControl: JobControl<TaskRecord>) {
    logger.info(`Task ${task.jobId}:${task.taskId} [${RunState[task.state]}] completed.`);
    this.jobQueue.addLog(task.jobId, 'info', `Task [${task.taskId}] completed.`);
    const updated = await taskControl.finish();
    this.emitTaskUpdate(updated);
    return this.jobQueue.wake(task.jobId, this.shortInterval);
  }

  private async onWorkerFailed(task: TaskRecord, taskControl: JobControl<TaskRecord>) {
    logger.info(`Task ${task.jobId}:${task.taskId} [${RunState[task.state]}] failed.`);
    this.jobQueue.addLog(task.jobId, 'error', `Task [${task.taskId}] failed.`);
    taskControl.log.error('Worker task failed.');
    const updated = await taskControl.fail();
    this.emitTaskUpdate(updated);
    return this.jobQueue.wake(task.jobId, this.shortInterval);
  }

  private isComplete(jobMessage: any) {
    if (jobMessage.status.conditions) {
      for (const c of jobMessage.status.conditions) {
        if (c.type === 'Complete') {
          return true;
        }
      }
    }
    return false;
  }

  private checkPodStatus(pod: any, taskControl: JobControl<TaskRecord>) {
    if (pod && pod.status && pod.status.containerStatuses) {
      for (const cs of pod.status.containerStatuses) {
        if (cs.state &&
            cs.state.waiting &&
            cs.state.waiting.reason === 'ErrImageNeverPull') {
          this.podError(taskControl, 'container image never pulled.');
          return true;
        } else if (cs.lastState &&
            cs.state.terminated &&
            cs.state.terminated.exitCode !== 0) {
          this.podError(taskControl, cs.lastState.terminated.message);
          return true;
        }
      }
    }
    return false;
  }

  private podError(taskControl: JobControl<TaskRecord>, message: string) {
    const task = taskControl.job;
    logger.info(`Task ${task.jobId}:${task.taskId} failed: ${message}.`);
    this.jobQueue.addLog(task.jobId, 'error', `Task [${task.taskId}] failed: ${message}.`);
    taskControl.log.error(`Task failed: ${message}.`);
    return taskControl.fail().then(() => {
      this.emitTaskUpdate(task);
      return this.jobQueue.wake(task.jobId, this.shortInterval);
    });
  }

  private emitJobUpdate(job: JobRecord): JobRecord {
    this.notifyJobChange(job, { jobsUpdated: [JobRecord.serialize(job)] });
    return job;
  }

  private emitTaskUpdate(task: TaskRecord): TaskRecord {
    this.notifyTaskChange(task.jobId, { tasksUpdated: [TaskRecord.serialize(task)] });
    return task;
  }

  private notifyJobChange(job: JobRecord, payload: JobChangeNotification) {
    this.deepstream.event.emit(`project.${job.project}.jobs`, payload);
  }

  private notifyTaskChange(jobId: string, payload: any) {
    this.deepstream.event.emit(`jobs.${jobId}`, payload);
  }
}
