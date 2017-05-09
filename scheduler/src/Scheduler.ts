import * as deepstream from 'deepstream.io-client-js';
import * as Queue from 'rethinkdb-job-queue';
import TaskSet from '../../common/recipes/TaskSet';
import { Recipe } from '../../common/types/api';
import { RunState } from '../../common/types/api';
import { JobError, JobRecord, TaskRecord } from '../../common/types/queue';
import K8 from './K8';
import { logger } from './logger';

interface JobControl {
  job: JobRecord;
  next: (error?: Error, job?: JobRecord | string) => void;
}

export default class Scheduler {
  private jobQueue: Queue<JobRecord>;
  private taskQueue: Queue<TaskRecord>;
  private r: any;
  private db: any;
  private deepstream: deepstreamIO.Client;
  private k8: K8;

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
    this.k8.getJobs().then(resp => {
      console.log(resp);
    });
  }

  public run() {
    // Job Queue processing loop.
    this.jobQueue.process((job, next, onCancel) => {
      logger.info('processing Job:', job.id, job.runState);
      const jobControl: JobControl = { job, next };
      if (!job.tasksCreated) {
        this.db.table('Recipes').get(job.recipe).run().then((recipe: any) => {
          if (!recipe) {
            const error = new JobError(`Recipe ${job.recipe} not found.`);
            error.details = { error: 'recipe-not-found', recipe: job.recipe };
            error.cancelJob = true;
            logger.error(`Job ${job.id} failed, recipe ${job.recipe} not found.`);
            job.runState = RunState.FAILED;
            job.update();
            next(error);
          } else {
            // Create tasks for this job
            try {
              this.createTasks(job, recipe);
              next(null, job);
            } catch (e) {
              logger.error(`Job ${job.id} failed creating tasks.`);
              job.runState = RunState.FAILED;
              job.update();
              e.cancelJob = true;
              next(e);
            }
          }
        }, (error: JobError) => {
          error.cancelJob = true;
          job.runState = RunState.FAILED;
          job.update();
          next(error);
        });
      } else if (job.runState === RunState.CANCELLING) {
        this.cancelTasks(job, jobControl);
      } else {
        this.updateJobStatus(job, jobControl);
      }
      // next(null, 'Job finished sucessfully.');
      onCancel(job, () => {
        // TODO: Do we want to move the logic from the director to here?
        logger.info('Job cancelled');
      });
    });

    // Task Queue processing loop.
    this.taskQueue.process((task, next, onCancel) => {
      logger.info('processing Task:', task.taskId);
      // OK folks here is where the rubber meets the road.
      // We're gonna have to call Kubernetes.
      if (task.runState === RunState.READY) {
        if (task.image) {
          logger.info('Creating K8 Job:', task.taskId);
          this.k8.createJob(task).then(resp => {
            console.log(resp.data);
            task.runState = RunState.RUNNING;
            task.k8Link = resp.data.metadata.selfLink;
            task.startedAt = new Date(resp.data.metadata.creationTimestamp);
            task.update().then(() => {
              this.emitJobEvent(task.jobId, { tasksUpdated: [TaskRecord.serialize(task)] });
            });
            next(null, task);
          }, error => {
            task.runState = RunState.FAILED;
            if (error.response && error.response.data) {
              task.addLog(error.response.data.message);
              logger.error(error.response.status, error.response.data.message);
            } else {
              // TODO: Handle other kinds of errors.
            }
            task.update().then(() => {
              this.emitJobEvent(task.jobId, { tasksUpdated: [TaskRecord.serialize(task)] });
            });
          });
        } else {
          // Task has no image, must have some other function.
          // next(null, task);
          task.runState = RunState.FAILED;
          task.update().then(() => {
            this.emitJobEvent(task.jobId, { tasksUpdated: [TaskRecord.serialize(task)] });
          });
          logger.error(`Task ${task.jobId}:${task.taskId} is missing an action.`);
        }
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
      } else {
        next(null, task);
      }

      // task.setDateEnable(new Date(Date.now() + 100));
      // next(null, task);
      // next(null, 'Job finished sucessfully.');
      onCancel(task, () => {
        logger.info('Task cancelled', task.status);
        this.emitJobEvent(task.jobId, { tasksUpdated: [TaskRecord.serialize(task)] });
      });
    });
  }

  private createTasks(job: JobRecord, recipe: Recipe) {
    logger.info('recipe: ', recipe.id);
    const taskSet = new TaskSet(recipe);
    taskSet.setUserArgs(job.submissionArgs);
    taskSet.createTasks();
    const readyTasks = [];
    const eternity = new Date(Date.now() + 1000 * 60 * 60 * 24  * 365 * 1000); // 1000 years
    for (const task of taskSet.taskList) {
      logger.info('new task: ', task.taskId);
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
    this.taskQueue.addJob(readyTasks).then(taskRecords => {
      job.tasksCreated = true;
      job.runState = RunState.RUNNING;
      job.update().then(() => {
        this.emitProjectJobEvent(job, { jobsUpdated: [JobRecord.serialize(job)] });
      });
    });
  }

  private cancelTasks(job: JobRecord, jobControl: JobControl) {
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
      this.emitProjectJobEvent(job, { jobsUpdated: [JobRecord.serialize(job)] });
      this.emitJobEvent(job.id, { tasksUpdated: tasks.map(TaskRecord.serialize) });
      this.jobQueue.cancelJob(job);
      jobControl.next(null, 'cancelled');
    });
  }

  private updateJobStatus(job: JobRecord, jobControl: JobControl) {
    const eternity = new Date(Date.now() + 1000 * 60 * 60 * 24  * 365 * 1000); // 1000 years
    const soon = new Date(Date.now() + 100); // 100 ms
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
      for (const task of tasks) {
        taskIdMap[task.id] = task;
      }
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
          job.runState = RunState.FAILED;
          const error = new JobError('canceled');
          error.cancelJob = true;
          jobControl.next(error);
        } else {
          job.setDateEnable(new Date(Date.now() + 1000 * 10));
          jobControl.next(null, job);
        }
      } else if (job.cancelledTasks.length > 0) {
        if (job.waitingTasks.length === 0 || job.runningTasks.length === 0) {
          job.runState = RunState.CANCELLED;
          job.update();
          const error = new JobError('canceled');
          error.cancelJob = true;
          jobControl.next(error);
        } else {
          job.setDateEnable(new Date(Date.now() + 1000 * 10));
          jobControl.next(null, job);
        }
      } else if (job.runningTasks.length === 0 && job.waitingTasks.length === 0) {
        job.runState = RunState.COMPLETED;
        job.update();
        jobControl.next(null, 'completed');
      } else {
        // Still running
        job.setDateEnable(eternity);
        jobControl.next(null, job);
      }
      this.emitProjectJobEvent(job, { tasksUpdated: [JobRecord.serialize(job)] });
    });
  }

  private emitProjectJobEvent(job: JobRecord, payload: any) {
    this.deepstream.event.emit(`project.${job.project}.jobs`, payload);
  }

  private emitJobEvent(jobId: string, payload: any) {
    this.deepstream.event.emit(`jobs.${jobId}`, payload);
  }
}
