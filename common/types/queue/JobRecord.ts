import * as Queue from 'rethinkdb-job-queue';
import { Job, RunState } from '../api';

/** Data structure of a Job as it is stored in the database. */
export class JobRecord extends Queue.Job {
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
      submissionArgs: record.submissionArgs,
      state: record.runState,
      createdAt: record.dateCreated,
      startedAt: record.dateStarted,
      endedAt: record.dateFinished,
      tasksTotal: 0,
      tasksCompleted: record.progress,
      tasksFailed: 0,
      workTotal: record.workTotal,
      workCompleted: record.workCompleted,
      workFailed: record.workFailed,
    };
  }

  public user: number;
  public username: string;
  public project: number;
  public asset: number;
  public mainFileName: string;
  public recipe: string;
  public description: string;
  public tasksTotal: number;
  public submissionArgs: { [key: string]: any };
  public runState: RunState;
  public tasksCompleted: number;
  public tasksFailed: number;
  public waitingTasks: string[];  // Task ids whose dependencies haven't been met.
  public runningTasks: string[];  // Task ids that are running
  public completedTasks: string[]; // Task ids that are finished successfully
  public canceledTasks: string[]; // Task ids that have been canceled
  public failedTasks: string[];   // Task ids that have failed
  public workTotal: number;       // Total amount of work, as computed from task weights;
  public workCompleted: number;   // Amount of work completed.
  public workFailed: number;      // Amount of work failed.
  public cancelRequested?: boolean;
  public tasksCreated?: boolean;
}
