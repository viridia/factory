import * as Ajv from 'ajv';
import Axios, { AxiosInstance, AxiosResponse } from 'axios';
import * as deepstream from 'deepstream.io-client-js';
import { NextFunction, Request, Response, Router } from 'express';
import {
  Job, JobChangeNotification, JobChangeRequest, JobRequest, LogEntry, RunState, Task,
} from '../../common/types/api';
import { JobRecord, TaskRecord } from '../../common/types/queue';
import { JobControl, Queue } from '../../queue';
import { logger } from './logger';
import { ajv, loadSchema } from './schemas';

/** Defines routes for creating and monitoring jobs and tasks. */
export default class JobRoutes {
  private router: Router;
  private jobRequestSchema: Ajv.ValidateFunction;
  private jobQueue: Queue<JobRecord>;
  private taskQueue: Queue<TaskRecord>;
  private deepstream: deepstreamIO.Client;
  private k8Api: AxiosInstance;

  constructor(
      jobQueue: Queue<JobRecord>, taskQueue: Queue<TaskRecord>, deepstream: deepstreamIO.Client) {
    this.router = Router();
    this.jobRequestSchema = loadSchema('./schemas/JobRequest.schema.json');
    this.deepstream = deepstream;
    this.jobQueue = jobQueue;
    this.taskQueue = taskQueue;
    this.routes();
    this.k8Api = Axios.create({
      baseURL: `http://${process.env.K8_HOST}:${process.env.K8_PORT}`,
    });
    // this.jobQueue.on('log', (queueId: string, jobId: string) => {
    //   console.log('Log event added to:', queueId, jobId);
    // });
  }

  /** Add this router to the parent router. */
  public apply(parent: Router): void {
    parent.use('/jobs', this.router);
  }

  private routes(): void {
    this.router.get('/:id/tasks', this.getTasks.bind(this));
    this.router.get('/:id/tasks/:task', this.getTask.bind(this));
    this.router.get('/:id/tasks/:task/logs', this.getTaskLogs.bind(this));
    this.router.get('/:id', this.getJob.bind(this));
    this.router.patch('/:id', this.patchJob.bind(this));
    this.router.delete('/:id', this.deleteJob.bind(this));
    this.router.get('/:id/logs', this.getJobLogs.bind(this));
    this.router.get('/', this.queryJobs.bind(this));
    this.router.post('/', this.create.bind(this));
  }

  private getJob(req: Request, res: Response, next: NextFunction): void {
    res.json({ message: `requesting job ${req.params.id}.` });
  }

  private patchJob(req: Request, res: Response, next: NextFunction): void {
    const jcr = req.body as JobChangeRequest;
    // console.info('patchJob:', req.params.id, jcr);
    this.jobQueue.get(req.params.id).then((job: JobRecord) => {
      if (job === null) {
        res.status(404).json({ error: 'not-found', id: req.params.id });
        return;
      }
      if (jcr.cancelled) {
        this.cancelJob(job, res);
      }
      res.end();
    });
  }

  private deleteJob(req: Request, res: Response, next: NextFunction): void {
    // console.info('Attempting to delete job:', req.params.id);
    this.jobQueue.get(req.params.id).then((job: JobRecord) => {
      if (job === null) {
        res.status(404).json({ error: 'not-found', id: req.params.id });
        return;
      }
      if (job.state !== RunState.RUNNING) {
        const promises: Array<Promise<any>> = [];
        // Delete all K8 jobs with that are labeled with this job's id.
        promises.push(this.k8Api.delete('/apis/batch/v1/namespaces/default/jobs', {
          params: {
            labelSelector: `factory.job=${job.id}`,
          },
        }).catch(error => {
          logger.error('Error deleting K8 jobs:', error.message || error, error.response.data);
        }));

        // Delete all K8 ppods with that are labeled with this job's id.
        promises.push(this.k8Api.delete('/api/v1/namespaces/default/pods', {
          params: {
            labelSelector: `factory.job=${job.id}`,
          },
        }).catch(error => {
          logger.error('Error deleting K8 pods:', error.message || error, error.response.data);
        }));

        // Delete job logs
        promises.push(this.jobQueue.deleteLogs(job.id).catch(error => {
          logger.info('Error deleting job logs:', error.message || error);
        }));

        // Delete all task logs
        this.taskQueue.find({ jobId: job.id }).then(tasks => {
          promises.push(this.taskQueue.deleteLogs(tasks.map(task => task.id)).catch(error => {
            logger.info('Error deleting task logs:', error.message || error);
          }));

          // Wait for deletions, return tasks either way.
          return Promise.all(promises).then(() => tasks);
        }).then(tasks => {
          return this.taskQueue.delete(tasks.map(t => t.id)).then(removedTasks => {
            return this.jobQueue.delete(req.params.id).then(removedJobs => {
              logger.info(`Job ${job.id} removed.`);
              this.notifyJobChange(job, { jobsDeleted: [job.id] });
              res.end();
            });
          });
        }, (error: any) => {
          logger.error(`Error removing job ${job.id}:`, error);
          res.status(500).json({ error: 'internal', message: error.message });
        });
      } else {
        logger.error(`Attempted to remove job ${job.id} that was running.`);
        logger.error(`Run state: ${RunState[job.state]}.`);
        res.status(400).json({ error: 'not-stopped' });
      }
    });
  }

  private queryJobs(req: Request, res: Response, next: NextFunction): void {
    this.jobQueue.find(this.pluck(req.query, 'user', 'project')).then(jobList => {
      res.json(jobList.filter(job => job.project !== undefined).map(JobRecord.serialize));
    }, error => {
      res.status(500).json({ error: 'internal', message: error.message });
      logger.error(`Error running job query:`, error);
    });
  }

  private create(req: Request, res: Response, next: NextFunction): void {
    const jr = req.body as JobRequest;
    if (!this.jobRequestSchema(jr)) {
      const errors = ajv.errorsText(this.jobRequestSchema.errors, { dataVar: 'JobRequest' });
      logger.error(`Schema validation errors:`, errors);
      res.status(400).json({ error: 'validation', message: errors });
      return;
    }
    const job = this.jobQueue.create({
      user: jr.user,
      username: jr.username,
      project: jr.project,
      asset: jr.asset,
      mainFileName: jr.mainFileName,
      recipe: jr.recipe,
      description: jr.description,
      submissionParams: jr.args || {},
      state: RunState.READY,
      waitingTasks: [],
      runningTasks: [],
      completedTasks: [],
      cancelledTasks: [],
      failedTasks: [],
      workTotal: 0,
      workCompleted: 0,
      workFailed: 0,
    });
    this.jobQueue.addJob(job).then(jobRecords => {
      const record = jobRecords[0];
      this.notifyJobChange(job, { jobsAdded: [JobRecord.serialize(record)] });
      res.json({ message: 'posting a new job.', job: record.id });
      logger.info('Job created:', jobRecords[0].id);
    }, error => {
      logger.error(`Error adding job:`, error);
      res.status(500).json({ error: 'internal', message: error.message });
    });
  }

  private getTasks(req: Request, res: Response, next: NextFunction): void {
    if (!req.params.id) {
      res.status(404).json({ error: 'required-param', message: 'Invalid Job ID' });
    }
    this.taskQueue.find(this.taskQuery(req.params.id, req.params.task)).then(taskList => {
      res.json(taskList.map(TaskRecord.serialize));
    }, error => {
      res.status(500).json({ error: 'internal', message: error.message });
      logger.error(`Error getting job tasks:`, error);
    });
  }

  private getTask(req: Request, res: Response, next: NextFunction): void {
    res.json([]);
  }

  private getJobLogs(req: Request, res: Response, next: NextFunction): void {
    // this.jobQueue.getLogs().orderBy('date').run()
    this.jobQueue.getLogs(req.params.id).then(entries => {
      res.json(entries);
    }, (error: any) => {
      res.status(500).json({ error: 'internal', message: error.message });
      logger.error(`Error getting job logs:`, error);
    });
  }

  private getTaskLogs(req: Request, res: Response, next: NextFunction): void {
    this.taskQueue.find(this.taskQuery(req.params.id, req.params.task)).then(tasks => {
      if (tasks.length === 1) {
        // this.taskQueue.getLogs().filter({ job: tasks[0].id }).orderBy('date').run()
        this.taskQueue.getLogs(tasks[0].id).then(entries => {
          res.json(entries);
        }, (error: any) => {
          res.status(500).json({ error: 'internal', message: error.message });
          logger.error(`Error getting job logs:`, error);
        });
      } else {
        logger.error(`Task ${req.params.id}:${req.params.task} not found.`, tasks.length);
        res.json([]);
      }
    }, error => {
      res.status(500).json({ error: 'internal', message: error.message });
      logger.error(`Error getting job tasks:`, error);
    });
  }

  private cancelJob(job: JobRecord, res: Response) {
    if (job.state === RunState.WAITING ||
        job.state === RunState.RUNNING ||
        job.state === RunState.READY) {
      logger.info(`Cancelling job ${job.id}, state [${RunState[job.state]}].`);
      this.jobQueue.getControl(job)
          .update({ state: RunState.CANCELLING })
          .reschedule(1).then(updated => {
        this.notifyJobChange(job, { jobsUpdated: [JobRecord.serialize(updated)] });
      });
    } else {
      logger.error(
        `Attempted to cancel job ${job.id} that was not running, state [${RunState[job.state]}]:`);
      res.status(400).json({ error: 'not-running' });
    }
  }

  private notifyJobChange(job: JobRecord, payload: JobChangeNotification) {
    this.deepstream.event.emit(`project.${job.project}.jobs`, payload);
  }

  private notifyTaskChange(jobId: string, payload: any) {
    this.deepstream.event.emit(`jobs.${jobId}`, payload);
  }

  private taskQuery(jobId?: string, taskId?: string): any {
    const result: any = {};
    if (jobId !== undefined) {
      result.jobId = jobId;
    }
    if (taskId !== undefined) {
      result.taskId = taskId;
    }
    return result;
  }

  private pluck<P extends { [key: string]: any }>(obj: P, ...keys: string[]): Partial<P> {
    const result: Partial<P> = {};
    for (const key of keys) {
      if (obj.hasOwnProperty(key)) {
        result[key] = obj[key];
      }
    }
    return result;
  }
}
