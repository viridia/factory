import * as Ajv from 'ajv';
import Axios, { AxiosInstance, AxiosResponse } from 'axios';
import * as deepstream from 'deepstream.io-client-js';
import { NextFunction, Request, Response, Router } from 'express';
import * as Queue from 'rethinkdb-job-queue';
import {
  Job, JobChangeNotification, JobChangeRequest, JobRequest, RunState, Task,
} from '../../common/types/api';
import { JobRecord, TaskRecord } from '../../common/types/queue';
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
    const [host, port] = process.env.RETHINKDB_HOST.split(':');
    this.router = Router();
    this.jobRequestSchema = loadSchema('./schemas/JobRequest.schema.json');
    this.deepstream = deepstream;
    this.jobQueue = jobQueue;
    this.taskQueue = taskQueue;
    this.routes();
    this.k8Api = Axios.create({
      baseURL: `http://${process.env.K8_HOST}:${process.env.K8_PORT}`,
    });
    this.jobQueue.on('log', (queueId: string, jobId: string) => {
      console.log('Log event added to:', queueId, jobId);
    });
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
    this.router.get('/', this.queryJobs.bind(this));
    this.router.post('/', this.createJob.bind(this));
    // this.router.get('/:id/logs', this.getJobLogs.bind(this));
  }

  private getJob(req: Request, res: Response, next: NextFunction): void {
    res.json({ message: `requesting job ${req.params.id}.` });
  }

  private patchJob(req: Request, res: Response, next: NextFunction): void {
    const jcr = req.body as JobChangeRequest;
    // console.info('patchJob:', req.params.id, jcr);
    this.jobQueue.getJob(req.params.id).then(jobs => {
      if (jobs.length === 0) {
        res.status(404).json({ error: 'not-found' });
        return;
      }
      const job = jobs[0];
      if (jcr.cancelled) {
        this.cancelJob(job, res);
      }
      res.end();
    });
  }

  private deleteJob(req: Request, res: Response, next: NextFunction): void {
    // console.info('Attempting to delete job:', req.params.id);
    this.jobQueue.getJob(req.params.id).then(jobs => {
      if (jobs.length === 0) {
        res.status(404).json({ error: 'not-found' });
        return;
      }
      const job = jobs[0];
      if (job.runState !== RunState.RUNNING || job.status === 'cancelled') {
        if (job.runState === RunState.RUNNING) {
          logger.warn(`Removing erroneously running job: ${job.id}.`);
        }
        this.taskQueue.findJob({ jobId: job.id }).then(tasks => {
          const promises = [];
          for (const task of tasks) {
            if (task.k8Link) {
              logger.info(`Resource ${task.k8Link} removed.`);
              promises.push(this.k8Api.delete(task.k8Link));
            }
          }
          // Wait for deletions, return tasks either way.
          return Promise.all(promises).then(() => tasks, () => {
            logger.info('resource deletion failed.');
            return tasks;
          });
        }).then(tasks => {
          return this.taskQueue.removeJob(tasks).then(removedTasks => {
            return this.jobQueue.removeJob(req.params.id).then(removedJobs => {
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
        logger.error(`Run state: ${RunState[job.runState]}.`);
        res.status(400).json({ error: 'not-stopped' });
      }
    });
  }

  private queryJobs(req: Request, res: Response, next: NextFunction): void {
    this.jobQueue.findJob({
      user: req.query.user,
      project: req.query.project,
    }).then(jobList => {
      res.json(jobList.filter(job => job.project !== undefined).map(JobRecord.serialize));
    }, error => {
      res.status(500).json({ error: 'internal', message: error.message });
      logger.error(`Error running job query:`, error);
    });
  }

  private createJob(req: Request, res: Response, next: NextFunction): void {
    const jr = req.body as JobRequest;
    if (!this.jobRequestSchema(jr)) {
      const errors = ajv.errorsText(this.jobRequestSchema.errors, { dataVar: 'JobRequest' });
      logger.error(`Schema validation errors:`, errors);
      res.status(400).json({ error: 'validation', message: errors });
      return;
    }
    const job = this.jobQueue.createJob({
      user: jr.user,
      username: jr.username,
      project: jr.project,
      asset: jr.asset,
      mainFileName: jr.mainFileName,
      recipe: jr.recipe,
      description: jr.description,
      submissionArgs: jr.args || {},
      runState: RunState.READY,
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
    this.taskQueue.findJob({ jobId: req.params.id }).then(taskList => {
      res.json(taskList.map(TaskRecord.serialize));
    }, error => {
      res.status(500).json({ error: 'internal', message: error.message });
      logger.error(`Error getting job tasks:`, error);
    });
  }

  private getTask(req: Request, res: Response, next: NextFunction): void {
    // res.json({ message: `requesting task ${req.params.id}.` });
  }

  private getTaskLogs(req: Request, res: Response, next: NextFunction): void {
    // res.json({ message: `requesting task ${req.params.id}.` });
  }

  private cancelJob(job: JobRecord, res: Response) {
    if (job.runState === RunState.RUNNING || job.runState === RunState.READY) {
      logger.info(`Cancelling job ${job.id}, state [${RunState[job.runState]}], status:`,
          job.status);
      job.runState = RunState.CANCELLING;
      job.setDateEnable(new Date());
      job.update().then(() => {
        this.notifyJobChange(job, { jobsUpdated: [JobRecord.serialize(job)] });
      });
    } else {
      logger.error(`Attempted to cancel job ${job.id} that was not running, status:`, job.status);
      res.status(400).json({ error: 'not-running' });
    }
  }

  private notifyJobChange(job: JobRecord, payload: JobChangeNotification) {
    this.deepstream.event.emit(`project.${job.project}.jobs`, payload);
  }

  private notifyTaskChange(jobId: string, payload: any) {
    this.deepstream.event.emit(`jobs.${jobId}`, payload);
  }
}
