import * as Queue from 'rethinkdb-job-queue';

/** Data structure of a Job as it is stored in the database. */
export class TaskRecord extends Queue.Job {
  public job: string;
  public name: string;
  public title: string;
  public depends: string[];
  public image: string;
  public args: string[];
  public inputs: string[];
  // public inputFilters: object[];
  public outputs: string[];
  // public outputFilters: object[];
}
