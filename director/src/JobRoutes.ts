// import { Job as ApiJob } from 'common/types/Job';
import { Job, JobRequest, JobState } from 'common/types';
import { NextFunction, Request, Response, Router } from 'express';
import * as Queue from 'rethinkdb-job-queue';
import { JobRecord } from './JobRecord';

/** Defines routes for creating and monitoring jobs and tasks. */
export default class JobRoutes {
  private router: Router;
  private jobQueue: Queue<JobRecord>;

  constructor() {
    this.router = Router();
    this.jobQueue = new Queue<JobRecord>({
      host: 'localhost',
      port: 8092,
      db: 'Factory',
    }, {
      name: 'JobQueue',
    });
    this.routes();
  }

  /** Add this router to the parent router. */
  public apply(parent: Router): void {
    parent.use('/api/v1', this.router);
  }

  private routes(): void {
    this.router.get('/jobs/:id', this.getJob.bind(this));
    this.router.get('/jobs', this.queryJobs.bind(this));
    this.router.post('/jobs', this.createJob.bind(this));
    this.router.get('/tasks/:id', this.getTask.bind(this));
    this.router.get('/tasks', this.queryTasks.bind(this));
  }

  private getJob(req: Request, res: Response, next: NextFunction): void {
    res.json({ message: `requesting job ${req.params.id}.` });
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

  private serializeJob(record: JobRecord): Job {
    return {
      id: record.id,
      user: record.user,
      username: record.username,
      project: record.project,
      asset: record.asset,
      mainFileName: record.mainFileName,
      recipe: record.recipe,
      description: record.description,
      state: JobState.WAITING,
      createdAt: record.dateCreated,
      startedAt: record.dateStarted,
      endedAt: record.dateFinished,
      tasksTotal: 0,
      tasksFinished: record.progress,
      tasksFailed: 0,
    };
  }
}
