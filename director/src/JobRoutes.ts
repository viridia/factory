// import { Job as ApiJob } from 'common/types/Job';
import { Job, JobChangeRequest, JobRequest, JobState } from 'common/types/api';
import { JobRecord } from 'common/types/queue';
import * as deepstream from 'deepstream.io-client-js';
import { NextFunction, Request, Response, Router } from 'express';
import * as Queue from 'rethinkdb-job-queue';

/** Defines routes for creating and monitoring jobs and tasks. */
export default class JobRoutes {
  private router: Router;
  private jobQueue: Queue<JobRecord>;
  private deepstream: deepstreamIO.Client;

  constructor(deepstream: deepstreamIO.Client) {
    const [host, port] = process.env.RETHINKDB_HOST.split(':');
    this.router = Router();
    this.deepstream = deepstream;
    this.jobQueue = new Queue<JobRecord>({ host, port, db: process.env.RETHINKDB_DB }, {
      name: 'JobQueue',
    });
    this.jobQueue.on('added', this.handleJobAdded.bind(this));
    this.jobQueue.on('removed', this.handleJobRemoved.bind(this));
    this.jobQueue.on('updated', this.handleJobUpdated.bind(this));
    this.routes();
  }

  /** Add this router to the parent router. */
  public apply(parent: Router): void {
    parent.use('/api/v1', this.router);
  }

  private routes(): void {
    this.router.get('/config', this.getConfig.bind(this));
    this.router.get('/jobs/:id', this.getJob.bind(this));
    this.router.patch('/jobs/:id', this.patchJob.bind(this));
    this.router.delete('/jobs/:id', this.deleteJob.bind(this));
    this.router.get('/jobs', this.queryJobs.bind(this));
    this.router.post('/jobs', this.createJob.bind(this));
    this.router.get('/tasks/:id', this.getTask.bind(this));
    this.router.get('/tasks', this.queryTasks.bind(this));
  }

  private getConfig(req: Request, res: Response, next: NextFunction): void {
    res.json({ hosts: { deepstream: process.env.DEEPSTREAM_HOST } });
  }

  private getJob(req: Request, res: Response, next: NextFunction): void {
    res.json({ message: `requesting job ${req.params.id}.` });
  }

  private patchJob(req: Request, res: Response, next: NextFunction): void {
    const jcr = req.body as JobChangeRequest;
    this.jobQueue.getJob(req.params.id).then(jobs => {
      console.debug(jobs);
    });
    // res.json({ message: `requesting job ${req.params.id}.` });
  }

  private deleteJob(req: Request, res: Response, next: NextFunction): void {
    console.info('Attempting to delete job:', req.params.id);
    this.jobQueue.cancelJob(req.params.id).then(jobs => {
      // const job = jobs[0];
      // console.info('Cancellation successful:', job);
      // this.deepstream.event.emit(`jobs.project.${job.project}`,
      //   { jobsUpdated: [this.serializeJob(job)] });
      res.end();
    }, (error: any) => {
      console.error(error);
      res.status(500).json({ message: error.message });
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
      this.deepstream.event.emit(`jobs.project.${job.project}`,
        { jobsAdded: [this.serializeJob(job)] });
    });
  }

  private handleJobRemoved(jobId: string) {
    this.jobQueue.getJob(jobId).then((jobs: [JobRecord]) => {
      const job = jobs[0];
      this.deepstream.event.emit(`jobs.project.${job.project}`, { jobsDeleted: [jobId] });
    });
  }

  private handleJobUpdated(queueId: string, jobId: string) {
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
    } else if (record.status === 'canceled') {
      state = JobState.CANCELED;
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
