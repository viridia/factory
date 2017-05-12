import * as Queue from 'rethinkdb-job-queue';
import { RunState, Task } from '../api';

/** Data structure of a Job as it is stored in the database. */
export class TaskRecord extends Queue.Job {
  public static serialize(record: TaskRecord): Task {
    return {
      id: record.taskId,
      jobId: record.jobId,
      step: record.step,
      index: record.index,
      depends: record.depends,
      state: record.runState,
      startedAt: record.startedAt,
      endedAt: record.dateFinished,
      outputs: record.outputs,
      image: record.image,
      workdir: record.workdir,
      args: record.args,
    };
  }

  public taskId: string;
  public jobId: string;
  public title: string;
  public step: number;
  public index: number;
  public depends: string[];
  public dependents: string[];
  public image: string;
  public workdir?: string;
  public args: string[];
  public inputs: string[];
  // public inputFilters: object[];
  public outputs: string[];
  // public outputFilters: object[];
  public weight: number;
  public runState: RunState;
  public startedAt?: Date;
  public k8Link?: string; // Link to Kubernetes Job
}
