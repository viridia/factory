import { Recipe } from 'factory-common/types/api';
import { JobRecord } from 'factory-common/types/queue';
import * as Queue from 'rethinkdb-job-queue';

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
        console.info('recipe: ', result.id);
        next(null, job);
      });
      // next(null, 'Job finished sucessfully.');
      onCancel(job, () => {
        console.info('Job canceled');
      });
    });
  }
}
