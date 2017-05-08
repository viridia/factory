import { RunState } from './RunState';

export interface Task {
  /** The id of this task (unique within a job). */
  id: string;

  /** The id of the job this task belongs to. */
  jobId: string;

  /** Which step of the recipe generated this task. */
  step: number;

  /** Ordinal number of this task within the entire job. */
  index: number;

  /** The current execution state of the job. */
  state: RunState;
}
