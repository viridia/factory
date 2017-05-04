import * as Queue from 'rethinkdb-job-queue';

/** Data structure of a Job as it is stored in the database. */
export class JobRecord extends Queue.Job {
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
  public waitingTasks: string[];  // Task ids whose dependencies haven't been met.
  public runningTasks: string[];  // Task ids that are running
  public finishedTasks: string[]; // Task ids that are finished successfully
  public canceledTasks: string[]; // Task ids that have been canceled
  public failedTasks: string[];   // Task ids that have failed
}
