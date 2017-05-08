import * as Ajv from 'ajv';
import * as deepstream from 'deepstream.io-client-js';
import { NextFunction, Request, Response, Router } from 'express';
import * as Queue from 'rethinkdb-job-queue';
import { Job, JobChangeRequest, JobRequest, RunState, Task } from '../../common/types/api';
import { JobRecord, TaskRecord } from '../../common/types/queue';
import { ajv, loadSchema } from './schemas';

/** Defines routes for creating and monitoring jobs and tasks. */
export default class JobRoutes {
  private router: Router;
  private jobRequestSchema: Ajv.ValidateFunction;
  private jobQueue: Queue<JobRecord>;
  private taskQueue: Queue<TaskRecord>;
  private deepstream: deepstreamIO.Client;

  constructor(
      jobQueue: Queue<JobRecord>, taskQueue: Queue<TaskRecord>, deepstream: deepstreamIO.Client) {
    const [host, port] = process.env.RETHINKDB_HOST.split(':');
    this.router = Router();
    this.jobRequestSchema = loadSchema('./schemas/JobRequest.schema.json');
    this.deepstream = deepstream;
    this.jobQueue = jobQueue;
    // this.jobQueue.on('added', this.handleJobAdded.bind(this));
    // this.jobQueue.on('updated', this.handleJobUpdated.bind(this));
    // this.jobQueue.on('cancelled', this.handleJobUpdated.bind(this));
    this.taskQueue = taskQueue;
    this.routes();
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
    console.info('patchJob:', req.params.id, jcr);
    this.jobQueue.getJob(req.params.id).then(jobs => {
      if (jobs.length === 0) {
        res.status(404).json({ error: 'not-found' });
        return;
      }
      const job = jobs[0];
      if (jcr.canceled) {
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
      if (job.runState !== RunState.RUNNING) {
        this.taskQueue.findJob({ jobId: job.id }).then(tasks => {
          return this.taskQueue.removeJob(tasks).then(removedTasks => {
            return this.jobQueue.removeJob(req.params.id).then(removedJobs => {
              console.info(`Job ${job.id} removed.`);
              this.emitProjectJobEvent(job, { jobsDeleted: [job.id] });
              res.end();
            });
          });
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
      res.json(jobList.filter(job => job.project !== undefined).map(JobRecord.serialize));
    }, error => {
      res.status(500).json({ error: 'internal', message: error.message });
      console.error(error);
    });
  }

  private createJob(req: Request, res: Response, next: NextFunction): void {
    const jr = req.body as JobRequest;
    // console.info('create job', jr);
    if (!this.jobRequestSchema(jr)) {
      const errors = ajv.errorsText(this.jobRequestSchema.errors, { dataVar: 'JobRequest' });
      console.error(errors);
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
      tasksTotal: 0,
      tasksCompleted: 0,
      tasksFailed: 0,
      waitingTasks: [],
      runningTasks: [],
      completedTasks: [],
      canceledTasks: [],
      failedTasks: [],
      workTotal: 0,
      workCompleted: 0,
      workFailed: 0,
    });
    this.jobQueue.addJob(job).then(jobRecords => {
      const record = jobRecords[0];
      this.emitProjectJobEvent(job, { jobsAdded: [JobRecord.serialize(record)] });
      res.json({ message: 'posting a new job.', job: record.id });
      console.info('Job created:', jobRecords[0].id);
    }, error => {
      console.error(error);
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
      console.error(error);
    });
  }

  private getTask(req: Request, res: Response, next: NextFunction): void {
    // res.json({ message: `requesting task ${req.params.id}.` });
  }

  private getTaskLogs(req: Request, res: Response, next: NextFunction): void {
    // res.json({ message: `requesting task ${req.params.id}.` });
  }

  private cancelJob(job: JobRecord, res: Response) {
    if (job.runState === RunState.RUNNING) {
    // } else if (job.status === 'active' || job.status === 'waiting') {
      job.runState = RunState.CANCELLING;
      job.setDateEnable(new Date());
      job.update().then(() => {
        this.emitProjectJobEvent(job, { jobsUpdated: [JobRecord.serialize(job)] });
      });
      // return this.taskQueue.findJob({ jobId: job.id }).then(tasks => {
      //   console.log(tasks);
      //   return this.taskQueue.cancelJob(tasks).then(canceledTasks => {
      //     return this.jobQueue.cancelJob(job.id).then(canceledJobs => {
      //       // this.emitJobEvent(job.id, {
      //       //   tasksCancelled: canceledTasks.map((taskId: string) => ({ jobId: job.id, taskId })) });
      //       this.emitProjectJobEvent(job, { jobsUpdated: [JobRecord.serialize(job)] });
      //       console.info(`Job ${job.id} canceled.`);
      //       res.end();
      //     }, (error: any) => {
      //       console.error(error);
      //       res.status(500).json({ error: 'internal', message: error.message });
      //     });
      //   });
      // });
    } else {
      console.error(`Attempted to cancel job ${job.id} that was not running`, job.status);
      res.status(400).json({ error: 'not-running' });
    }
  }

  // private handleJobAdded(queueId: string, jobId: string) {
  //   this.jobQueue.getJob(jobId).then((jobs: [JobRecord]) => {
  //     const job = jobs[0];
  //     // TODO: Also post to user's channel?
  //     this.emitProjectJobEvent(job, { jobsAdded: [JobRecord.serialize(job)] });
  //   });
  // }
  //
  // private handleJobUpdated(queueId: string, jobId: string) {
  //   console.info('job updated:', jobId);
  //   this.jobQueue.getJob(jobId).then((jobs: JobRecord[]) => {
  //     const job = jobs[0];
  //     // All jobs on single per-project channel.
  //     this.emitProjectJobEvent(job, { jobsUpdated: [JobRecord.serialize(job)] });
  //   });
  // }

  private emitProjectJobEvent(job: JobRecord, payload: any) {
    this.deepstream.event.emit(`project.${job.project}.jobs`, payload);
  }

  private emitJobEvent(jobId: string, payload: any) {
    this.deepstream.event.emit(`jobs.${jobId}`, payload);
  }
}
