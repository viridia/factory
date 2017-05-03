import * as Queue from 'rethinkdb-job-queue';

/** Data structure of a Job as it is stored in the database. */
export class JobRecord extends Queue.AbstractJob {
  public user: number;
  public username: string;
  public project: number;
  public asset: number;
  public mainFileName: string;
  public recipe: string;
  public description: string;
  public tasksTotal: number;
  public tasksFinished: number;
  public tasksFailed: number;
}
