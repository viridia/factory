import * as Queue from 'rethinkdb-job-queue';
import { Recipe } from '../../common/types/api';
import { JobError, JobRecord } from '../../common/types/queue';

export default class Scheduler {
  private jobQueue: Queue<JobRecord>;
  private r: any;

  constructor() {
    const [host, port] = process.env.RETHINKDB_HOST.split(':');
    this.jobQueue = new Queue<JobRecord>({ host, port, db: 'Factory' }, {
      name: 'JobQueue',
    });
    this.r = this.jobQueue.r;
  }

  public run() {
    this.jobQueue.process((job, next, onCancel) => {
      console.info('processing Job:', job.id);
      this.r.db('Factory').table('Recipes').get(job.recipe).run().then((result: any) => {
        if (!result) {
          const error = new JobError(`Recipe ${job.recipe} not found.`);
          error.details = { error: 'recipe-not-found', recipe: job.recipe };
          error.cancelJob = true;
          next(error);
        } else {
          console.info('recipe: ', result.id);
          next(null, job);
        }
      }, (error: Error) => {
        next(error, job);
      });
      // next(null, 'Job finished sucessfully.');
      onCancel(job, () => {
        console.info('Job canceled');
      });
    });
  }
}
