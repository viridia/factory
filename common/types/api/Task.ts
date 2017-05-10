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

  /** List of tasks on which this tasks depends. */
  depends: string[];

  /** The current execution state of the job. */
  state: RunState;

  /** When the task actually started processing. */
  startedAt: Date;

  /** When the task finished. */
  endedAt: Date;

  /** List of output files. */
  outputs: string[];

  /** Image that was run. */
  image?: string;

  /** Arguments to that image. */
  args: string[];
}
