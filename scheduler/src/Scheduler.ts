import * as deepstream from 'deepstream.io-client-js';
import * as Queue from 'rethinkdb-job-queue';
import TaskSet from '../../common/recipes/TaskSet';
import { JobChangeNotification, Recipe } from '../../common/types/api';
import { RunState } from '../../common/types/api';
import { JobRecord, TaskRecord } from '../../common/types/queue';
import JobControl from './JobControl';
import K8 from './K8';
import { logger } from './logger';

export default class Scheduler {
  private jobQueue: Queue<JobRecord>;
  private taskQueue: Queue<TaskRecord>;
  private r: any;
  private db: any;
  private deepstream: deepstreamIO.Client;
  private k8: K8;

  private shortInterval: number = 100; // 10ms
  private mediumInterval: number = 3000; // 3 minutes
  private longInterval: number = 1000 * 60; // One hour

  constructor() {
    this.deepstream = deepstream(
      `${process.env.DEEPSTREAM_SERVICE_HOST}:${process.env.DEEPSTREAM_SERVICE_PORT}`).login();
    const interval = parseInt(process.env.QUEUE_MASTER_INTERVAL, 10);
    logger.info(`Connecting to job queue ${process.env.DB_NAME}:${process.env.JOB_QUEUE_NAME}.`);
    this.jobQueue = new Queue<JobRecord>({
      host: process.env.RETHINKDB_PROXY_SERVICE_HOST,
      port: process.env.RETHINKDB_PROXY_SERVICE_PORT,
      db: process.env.DB_NAME }, {
      name: process.env.JOB_QUEUE_NAME,
      masterInterval: interval,
    });
    logger.info(`Connecting to job queue ${process.env.DB_NAME}:${process.env.TASK_QUEUE_NAME}.`);
    this.taskQueue = new Queue<TaskRecord>({
      host: process.env.RETHINKDB_PROXY_SERVICE_HOST,
      port: process.env.RETHINKDB_PROXY_SERVICE_PORT,
      db: process.env.DB_NAME }, {
      name: process.env.TASK_QUEUE_NAME,
      masterInterval: interval,
    });
    this.r = this.jobQueue.r;
    this.db = this.r.db(process.env.DB_NAME);
    this.k8 = new K8();
  }

  public run() {
    // Job Queue processing loop.
    this.jobQueue.process((job, next, onCancel) => {
      logger.info(`Processing Job: ${job.id} [${RunState[job.runState]}]`);
      const jobControl = new JobControl<JobRecord>(next);
      if (job.runState === RunState.READY) {
        this.evalRecipe(job, jobControl);
      } else if (job.runState === RunState.CANCELLING) {
        this.cancelTasks(job, jobControl);
      } else if (job.runState === RunState.RUNNING) {
        this.updateJobStatus(job, jobControl);
      } else if (job.runState === RunState.CANCELLED) {
        // Should already have been cancelled
        jobControl.cancel('cancelled');
      } else if (job.runState === RunState.FAILED) {
        // Should already have been cancelled
        jobControl.cancel('failed');
      }

      onCancel(job, () => {
        // TODO: Do we want to move the logic from the director to here?
        logger.info(`Job ${job.id} onCancel() called.`, RunState[job.runState]);
      });
    });

    // Task Queue processing loop.
    this.taskQueue.process((task, next, onCancel) => {
      logger.info(`Processing Task: ${task.jobId}:${task.taskId} [${RunState[task.runState]}]`);
      const taskControl = new JobControl<TaskRecord>(next);
      if (task.runState === RunState.READY) {
        this.beginTask(task, taskControl);
      } else if (task.runState === RunState.CANCELLING) {
        if (task.k8Link) {
          this.k8.deleteJob(task).then(resp => {
            console.log('cancelled response:', resp.data);
            // task.runState = RunState.CANCELLED;
            // next(null, task);
          }, error => {
            console.log('cancel failed:', error.response);
          });
        }
      } else if (task.runState === RunState.RUNNING) {
        this.updateTaskStatus(task, taskControl);
      } else {
        // TODO: change this.
        next(null, task);
      }

      onCancel(task, () => {
        logger.info(`Job ${task.id} onCancel() called.`, RunState[task.runState]);
        // this.notifyTaskChange(task.jobId, { tasksUpdated: [TaskRecord.serialize(task)] });
      });
    });
  }

  private evalRecipe(job: JobRecord, jobControl: JobControl<JobRecord>): void {
    this.db.table('Recipes').get(job.recipe).run().then((recipe: any) => {
      if (!recipe) {
        logger.error(`Job ${job.id} failed, recipe ${job.recipe} not found.`);
        job.runState = RunState.FAILED;
        job.update();
        job.addLog({ recipe: job.recipe }, 'Recipe not found.', 'error');
        jobControl.cancel('failed');
      } else {
        // Create tasks for this job
        job.addLog({}, 'Creating tasks.');
        // Note that the following method modifies the job object.
        this.createRecipeTasks(job, jobControl, recipe).then(() => {
          job.runState = RunState.RUNNING;
          // Tasks have been added, but are in the 'ready' state; reschedule the job immediately
          // so that we can start running them.
          jobControl.reschedule(job, new Date(Date.now() + 100));
          this.notifyJobChange(job, { jobsUpdated: [JobRecord.serialize(job)] });
        }, error => {
          logger.error(`Job ${job.id} failed creating tasks: ${error.message}`);
          job.runState = RunState.FAILED;
          job.update();
          jobControl.fatal(error);
          this.notifyJobChange(job, { jobsUpdated: [JobRecord.serialize(job)] });
        });
      }
    });
  }

  private createRecipeTasks(job: JobRecord, jobControl: JobControl<JobRecord>, recipe: Recipe) {
    logger.info(`Creating recipe tasks for job ${job.id}, recipe ${job.recipe}.`);
    const taskSet = new TaskSet(recipe);
    taskSet.setUserArgs(job.submissionArgs);
    try {
      taskSet.createTasks();
    } catch (e) {
      return Promise.reject(e);
    }
    const readyTasks = [];
    const eternity = new Date(Date.now() + this.longInterval);
    for (const task of taskSet.taskList) {
      logger.info(`Creating new task: ${job.id}:${task.taskId}.`);
      const taskRecord = this.taskQueue.createJob({
        ...task,
        jobId: job.id,
      });
      readyTasks.push(taskRecord);
      if (taskRecord.depends.length === 0) {
        taskRecord.runState = RunState.READY;
        job.runningTasks.push(task.taskId);
      } else {
        // For tasks that are not ready, set a start time far in the future. We'll modify
        // this when the tasks become ready.
        taskRecord.runState = RunState.WAITING;
        taskRecord.setDateEnable(eternity);
        job.waitingTasks.push(task.taskId);
      }
    }

    // Add all the tasks to the task queue
    return this.taskQueue.addJob(readyTasks);
  }

  private cancelTasks(job: JobRecord, jobControl: JobControl<JobRecord>) {
    this.taskQueue.findJob({ jobId: job.id }).then(tasks => {
      for (const task of tasks) {
        if (task.runState !== RunState.CANCELLED) {
          task.runState = RunState.CANCELLING;
          task.update();
        }
      }
      // TODO: Actually should wait until all the tasks have finished cancelling.
      job.runState = RunState.CANCELLED;
      job.update();
      this.notifyJobChange(job, { jobsUpdated: [JobRecord.serialize(job)] });
      this.notifyTaskChange(job.id, { tasksUpdated: tasks.map(TaskRecord.serialize) });
      this.jobQueue.cancelJob(job);
      jobControl.complete('cancelled');
    });
  }

  private updateJobStatus(job: JobRecord, jobControl: JobControl<JobRecord>) {
    console.log('updating job status');
    const eternity = new Date(Date.now() + 1000 * 60 * 60 * 24  * 365 * 1000); // 1000 years
    const soon = new Date(Date.now() + this.shortInterval); // 100 ms
    let workTotal = 0;
    let workCompleted = 0;
    let workFailed = 0;
    const waitingTasks: string[] = [];
    const runningTasks: string[] = [];
    const cancelledTasks: string[] = [];
    const completedTasks: string[] = [];
    const failedTasks: string[] = [];
    const taskIdMap: { [key: string]: TaskRecord } = {};
    return this.taskQueue.findJob({ jobId: job.id }).then(tasks => {
      // Build a map of all tasks by task id.
      for (const task of tasks) {
        taskIdMap[task.id] = task;
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
          depCounts[dep ? dep.runState : RunState.FAILED] += 1;
        }
        switch (task.runState) {
          case RunState.WAITING:
            if (depCounts[RunState.CANCELLING] > 0 || depCounts[RunState.CANCELLED] > 0) {
              // If any of our dependenies are cancelled, then this is too.
              task.runState = RunState.CANCELLED;
              task.update();
              this.taskQueue.cancelJob(task);
              cancelledTasks.push(task.id);
            } else if (depCounts[RunState.FAILED] > 0) {
              // If any of our dependenies are failed, then this task is too.
              task.runState = RunState.FAILED;
              this.taskQueue.cancelJob(task);
              task.update();
              failedTasks.push(task.id);
            } else if (depCounts[RunState.COMPLETED] === task.depends.length) {
              // All dependencies completed.
              task.runState = RunState.READY;
              task.setDateEnable(soon);
              runningTasks.push(task.id);
            } else {
              waitingTasks.push(task.id);
            }
            break;
          case RunState.READY:
          case RunState.RUNNING:
            // Ready tasks are considerd running for purposes of determining overall job state.
            runningTasks.push(task.id);
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
      job.workTotal = workTotal;
      job.workCompleted = workCompleted;
      job.workFailed = workFailed;
      job.waitingTasks = waitingTasks;
      job.runningTasks = runningTasks;
      job.cancelledTasks = cancelledTasks;
      job.completedTasks = completedTasks;
      job.failedTasks = failedTasks;
      if (job.failedTasks.length > 0) {
        if (job.waitingTasks.length === 0 || job.runningTasks.length === 0) {
          logger.info(`Job ${job.id} has ${failedTasks.length} failing tasks and no running tasks.`);
          logger.info(`Setting job ${job.id} state to FAILED.`);
          job.runState = RunState.FAILED;
          job.update();
          jobControl.cancel('cancelled');
        } else {
          logger.info(`Job ${job.id} has ${failedTasks.length} failing tasks and ` +
              `${waitingTasks.length + runningTasks.length}.`);
          logger.info(`Waiting for ${job.id} tasks to finish.`);
          jobControl.reschedule(job, new Date(Date.now() + 1000 * 10));
        }
      } else if (job.cancelledTasks.length > 0) {
        if (job.waitingTasks.length === 0 || job.runningTasks.length === 0) {
          job.runState = RunState.CANCELLED;
          job.update();
          jobControl.cancel('cancelled');
        } else {
          jobControl.reschedule(job, new Date(Date.now() + 1000 * 10));
        }
      } else if (job.runningTasks.length === 0 && job.waitingTasks.length === 0) {
        job.runState = RunState.COMPLETED;
        job.update();
        jobControl.complete();
      } else {
        // Still running
        jobControl.reschedule(job, eternity);
      }
      this.notifyJobChange(job, { jobsUpdated: [JobRecord.serialize(job)] });
    }, error => {
      job.runState = RunState.FAILED;
      job.update();
      jobControl.fatal(error);
    });
  }

  private beginTask(task: TaskRecord, taskControl: JobControl<TaskRecord>) {
    if (task.image) {
      logger.info('Creating K8 Job:', task.taskId);
      this.k8.createJob(task).then(resp => {
        logger.info(`Task ${task.jobId}:${task.taskId} image started.`);
        // console.log('k8 initial status:', resp.data.status);
        task.runState = RunState.RUNNING;
        task.k8Link = resp.data.metadata.selfLink;
        task.startedAt = new Date(resp.data.metadata.creationTimestamp);
        taskControl.reschedule(task, new Date(Date.now() + 1000 * 5));
        this.notifyTaskChange(task.jobId, { tasksUpdated: [TaskRecord.serialize(task)] });
        this.jobQueue.findJob(task.jobId).then(jobs => {
          const nextTime = new Date(Date.now() + this.shortInterval);
          for (const job of jobs) {
            if (job.runState === RunState.RUNNING && job.dateEnable > nextTime) {
              job.setDateEnable(nextTime);
              job.update();
            }
          }
        });
      }, error => {
        task.runState = RunState.FAILED;
        if (error.response && error.response.data) {
          task.addLog(error.response.data.message);
          logger.error(error.response.status, error.response.data.message);
        } else {
          // TODO: Handle other kinds of errors.
        }
        task.update().then(() => {
          taskControl.fatal(error);
          this.notifyTaskChange(task.jobId, { tasksUpdated: [TaskRecord.serialize(task)] });
        });
      });
    } else {
      // console.log(task);
      // Task has no image, must have some other action specified.
      task.runState = RunState.FAILED;
      task.update().then(() => {
        taskControl.cancel('no-actions.');
        this.notifyTaskChange(task.jobId, { tasksUpdated: [TaskRecord.serialize(task)] });
        logger.error(`Task ${task.jobId}:${task.taskId} is missing an action.`);
      });
    }
  }

  private updateTaskStatus(task: TaskRecord, taskControl: JobControl<TaskRecord>) {
    if (task.k8Link) {
      logger.info(`Getting K8 status of ${task.jobId}:${task.taskId}.`);
      this.k8.getJobStatus(task).then(resp => {
        if (resp.status.succeeded) {
          logger.info(`Task ${task.jobId}:${task.taskId} succeeded.`);
          task.runState = RunState.COMPLETED;
          task.update();
          taskControl.complete();
          // Move to wakeJob function()
          this.jobQueue.findJob(task.jobId).then(jobs => {
            const nextTime = new Date(Date.now() + this.shortInterval);
            for (const job of jobs) {
              if (job.runState === RunState.RUNNING && job.dateEnable > nextTime) {
                job.setDateEnable(nextTime);
                job.update();
              }
            }
          });
        } else {
          console.log('job status:', resp.status);
        }
      }, error => {
        console.log('cancel failed:', error.response);
      });
    } else {
      logger.info(`Task ${task.jobId}:${task.taskId} is running but has no action.`);
      task.runState = RunState.FAILED;
      task.update().then(() => {
        logger.info(`Setting task ${task.jobId}:${task.taskId} status to FAILED.`);
        taskControl.cancel('no-actions.');
        this.notifyTaskChange(task.jobId, { tasksUpdated: [TaskRecord.serialize(task)] });
      });
    }
  }

  private notifyJobChange(job: JobRecord, payload: JobChangeNotification) {
    this.deepstream.event.emit(`project.${job.project}.jobs`, payload);
  }

  private notifyTaskChange(jobId: string, payload: any) {
    this.deepstream.event.emit(`jobs.${jobId}`, payload);
  }
}
