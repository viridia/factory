import { Job } from '../../queue';
import { RunState, Task } from '../api';

/** Data structure of a Job as it is stored in the database. */
export class TaskRecord implements Job {
  public static serialize(record: TaskRecord): Task {
    return {
      id: record.taskId,
      jobId: record.jobId,
      step: record.step,
      index: record.index,
      depends: record.depends,
      state: record.state,
      startedAt: record.startedAt,
      endedAt: record.endedAt,
      outputs: record.outputs,
      image: record.image,
      workdir: record.workdir,
      args: record.args,
    };
  }

  // from queue.Job
  public id: string;
  public state: RunState;
  public when: Date;
  public startedAt?: Date;
  public endedAt?: Date;

  // New fields
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
  public k8Link?: string; // Link to Kubernetes Job
  public workStarted: boolean;
}
