import * as Ajv from 'ajv';
import * as deepstream from 'deepstream.io-client-js';
import { NextFunction, Request, Response, Router } from 'express';
import * as fs from 'fs';
import * as Queue from 'rethinkdb-job-queue';
import { Job, JobChangeRequest, JobRequest, JobState } from '../../common/types/api';
import { JobRecord } from '../../common/types/queue';
import { ajv, loadSchema } from './schemas';

/** Defines routes for creating and monitoring jobs and tasks. */
export default class JobRoutes {
  private router: Router;
  private jobRequestSchema: Ajv.ValidateFunction;
  private jobQueue: Queue<JobRecord>;
  private deepstream: deepstreamIO.Client;

  constructor(jobQueue: Queue<JobRecord>, deepstream: deepstreamIO.Client) {
    const [host, port] = process.env.RETHINKDB_HOST.split(':');
    this.router = Router();
    this.jobRequestSchema = loadSchema('./schemas/JobRequest.schema.json');
    this.deepstream = deepstream;
    this.jobQueue = jobQueue;
    this.jobQueue.on('added', this.handleJobAdded.bind(this));
    this.jobQueue.on('updated', this.handleJobUpdated.bind(this));
    this.jobQueue.on('cancelled', this.handleJobUpdated.bind(this));
    this.routes();
  }

  /** Add this router to the parent router. */
  public apply(parent: Router): void {
    parent.use('/jobs', this.router);
  }

  private routes(): void {
    this.router.get('/:id', this.getJob.bind(this));
    this.router.patch('/:id', this.patchJob.bind(this));
    this.router.delete('/:id', this.deleteJob.bind(this));
    this.router.get('/', this.queryJobs.bind(this));
    this.router.post('/', this.createJob.bind(this));
    // this.router.get('/:id/logs', this.getJobLogs.bind(this));
    // this.router.get('/tasks/:id', this.getTask.bind(this));
    // this.router.get('/tasks/:id/logs', this.getTask.bind(this));
    // this.router.get('/tasks', this.queryTasks.bind(this));
  }

  private getJob(req: Request, res: Response, next: NextFunction): void {
    res.json({ message: `requesting job ${req.params.id}.` });
  }

  private patchJob(req: Request, res: Response, next: NextFunction): void {
    const jcr = req.body as JobChangeRequest;
    console.info('patchJob:', req.params.id, jcr);
    this.jobQueue.getJob(req.params.id).then(jobs => {
      if (jobs.length === 0) {
        res.status(404).json({ error: 'not-found' });
        return;
      }
      const job = jobs[0];
      if (jcr.canceled) {
        if (job.status === 'created') {
          // Job was never put in the queue
          this.jobQueue.removeJob(req.params.id).then(canceledJobs => {
            console.info(`Job ${job.id} removed.`);
            res.end();
          }, (error: any) => {
            console.error(error);
            res.status(500).json({ error: 'internal', message: error.message });
          });
        } else if (job.status === 'active' || job.status === 'waiting') {
          this.jobQueue.cancelJob(req.params.id).then(canceledJobs => {
            console.info(`Job ${job.id} canceled.`);
            res.end();
          }, (error: any) => {
            console.error(error);
            res.status(500).json({ error: 'internal', message: error.message });
          });
        } else {
          console.error(`Attempted to cancel job ${job.id} that was not running`);
          res.status(400).json({ error: 'not-running' });
        }
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
      if (job.status !== 'active') {
        this.jobQueue.removeJob(req.params.id).then(canceledJobs => {
          console.info(`Job ${job.id} removed.`);
          this.deepstream.event.emit(`jobs.project.${job.project}`, { jobsDeleted: [job.id] });
          res.end();
        }, (error: any) => {
          console.error(error);
          res.status(500).json({ error: 'internal', message: error.message });
        });
      } else {
        console.error(`Attempted to remove job ${job.id} that was running`);
        res.status(400).json({ error: 'not-stopped' });
      }
    });
  }

  private queryJobs(req: Request, res: Response, next: NextFunction): void {
    this.jobQueue.findJob({
      user: req.query.user,
      project: req.query.project,
    }).then(jobList => {
      res.json(jobList.map(this.serializeJob));
    }, error => {
      console.error(error);
    });
  }

  private createJob(req: Request, res: Response, next: NextFunction): void {
    const jr = req.body as JobRequest;
    console.info('create job', jr);
    if (!this.jobRequestSchema(jr)) {
      const errors = ajv.errorsText(this.jobRequestSchema.errors, { dataVar: 'JobRequest' });
      console.error(errors);
      res.status(400).json({ error: 'validation', message: errors });
      return;
    }
    const jobData = this.jobQueue.createJob({
      user: jr.user,
      username: jr.username,
      project: jr.project,
      asset: jr.asset,
      mainFileName: jr.mainFileName,
      recipe: jr.recipe,
      description: jr.description,
      tasksTotal: 0,
      tasksFinished: 0,
      tasksFailed: 0,
      waitingTasks: [],
      runningTasks: [],
      finishedTasks: [],
      canceledTasks: [],
      failedTasks: [],
    });
    this.jobQueue.addJob(jobData).then(jobRecords => {
      res.json({ message: 'posting a new job.', job: jobRecords[0].id });
    }, error => {
      console.error(error);
      res.status(500).json({ error: 'internal', message: error.message });
    });
  }

  private getTask(req: Request, res: Response, next: NextFunction): void {
    res.json({ message: `requesting task ${req.params.id}.` });
  }

  private queryTasks(req: Request, res: Response, next: NextFunction): void {
    res.json({ message: 'requesting all tasks.' });
  }

  private handleJobAdded(queueId: string, jobId: string) {
    this.jobQueue.getJob(jobId).then((jobs: [JobRecord]) => {
      const job = jobs[0];
      // TODO: Also post to user's channel?
      this.deepstream.event.emit(`jobs.project.${job.project}`,
        { jobsAdded: [this.serializeJob(job)] });
    });
  }

  private handleJobUpdated(queueId: string, jobId: string) {
    console.info('job updated:', jobId);
    this.jobQueue.getJob(jobId).then((jobs: [JobRecord]) => {
      const job = jobs[0];
      this.deepstream.event.emit(`jobs.project.${job.project}`,
        { jobsUpdated: [this.serializeJob(job)] });
    });
  }

  private serializeJob(record: JobRecord): Job {
    let state = JobState.WAITING;
    if (record.status === 'active') {
      state = JobState.RUNNING;
    } else if (record.status === 'cancelled') {
      state = JobState.CANCELLED;
    } else if (record.status === 'completed') {
      state = JobState.COMPLETED;
    } else if (record.status === 'failed' || record.status === 'terminated') {
      state = JobState.FAILED;
    }
    return {
      id: record.id,
      user: record.user,
      username: record.username,
      project: record.project,
      asset: record.asset,
      mainFileName: record.mainFileName,
      recipe: record.recipe,
      description: record.description,
      state,
      createdAt: record.dateCreated,
      startedAt: record.dateStarted,
      endedAt: record.dateFinished,
      tasksTotal: 0,
      tasksFinished: record.progress,
      tasksFailed: 0,
    };
  }
}
