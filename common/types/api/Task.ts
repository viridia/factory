/** The execution state of a job or task. */
export enum TaskState {
  WAITING,
  RUNNING,
  FINISHED,
  FAILED,
}

export interface Task {
  /** The id of this task (unique within a job). */
  id: string;

  /** The id of the job this task belongs to. */
  jobId: number;

  /** Which step of the recipe generated this task. */
  step: number;

  /** If a recipe step has multiple tasks, this is the index of the task. Usually this means
      frame number, but could represent other kinds of parallelism. */
  index: number;

  /** The current execution state of the job. */
  state: TaskState;
}
