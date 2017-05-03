import { JobRecord } from 'common/types/queue';
import * as Queue from 'rethinkdb-job-queue';

export default class Scheduler {
  private jobQueue: Queue<JobRecord>;

  constructor() {
    const [host, port] = process.env.RETHINKDB_HOST.split(':');
    this.jobQueue = new Queue<JobRecord>({ host, port, db: 'Factory' }, {
      name: 'JobQueue',
    });
  }

  public run() {
    this.jobQueue.process((job, next, onCancel) => {
      next(null, 'Job finished sucessfully.');
      onCancel(job, () => {
        console.info('Job canceled');
      });
    });
  }
}
