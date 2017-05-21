import * as queue from '../../queue';
import { Job, RunState } from '../api';

/** Data structure of a Job as it is stored in the database. */
export class JobRecord implements queue.Job {
  public static serialize(record: JobRecord): Job {
    return {
      id: record.id,
      user: record.user,
      username: record.username,
      project: record.project,
      asset: record.asset,
      mainFileName: record.mainFileName,
      recipe: record.recipe,
      description: record.description,
      submissionParams: record.submissionParams,
      state: record.state,
      createdAt: record.createdAt,
      startedAt: record.startedAt,
      endedAt: record.endedAt,
      tasksTotal: (record.waitingTasks || []).length +
        (record.runningTasks || []).length +
        (record.cancelledTasks || []).length +
        (record.completedTasks || []).length +
        (record.failedTasks || []).length,
      tasksCompleted: (record.completedTasks || []).length,
      tasksFailed: (record.failedTasks || []).length,
      workTotal: record.workTotal,
      workCompleted: record.workCompleted,
      workFailed: record.workFailed,
    };
  }

  // from queue.Job
  public id: string;
  public state: RunState;
  public when: Date;
  public startedAt?: Date;
  public endedAt?: Date;

  // New fields
  public createdAt?: Date;
  public user: number;
  public username: string;
  public project: number;
  public asset: number;
  public mainFileName: string;
  public recipe: string;
  public description: string;
  public submissionParams: { [key: string]: any };
  public waitingTasks: string[];  // Task ids whose dependencies haven't been met.
  public runningTasks: string[];  // Task ids that are running
  public completedTasks: string[]; // Task ids that are finished successfully
  public cancelledTasks: string[]; // Task ids that have been cancelled
  public failedTasks: string[];   // Task ids that have failed
  public workTotal: number;       // Total amount of work, as computed from task weights;
  public workCompleted: number;   // Amount of work completed.
  public workFailed: number;      // Amount of work failed.
  public cancelRequested?: boolean;
  public tasksCreated?: boolean;
  public concurrencyLimit: number;
}
