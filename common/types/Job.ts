/** The execution state of a job or task. */
export enum JobState {
  WAITING,
  RUNNING,
  FINISHED,
  FAILED,
}

/** Describes a queued render job. */
export interface Job {
  /** The job id (globally unique). */
  id: string;

  /** The id of the user that submitted this job. */
  user: number;

  /** The string username of the user. */
  username: string;

  /** The project id. */
  project: number;

  /** The asset id. */
  asset: number;

  /** The name of the main input file. */
  mainFileName: string;

  /** The name of the recipe to execute for this job. */
  recipe: string;

  /** Text description of this job. */
  description: string;

  /** The current execution state of the job. */
  state: JobState;

  /** Timestamp when the job was initially created. */
  createdAt: Date;

  /** Timestamp when the job started running. */
  startedAt?: Date;

  /** Timestamp when the job completed (either succesfully or not). */
  endedAt?: Date;

  /** The total number of tasks needed to run for this job. */
  tasksTotal: number;

  /** Number of tasks finished. */
  tasksFinished: number;

  /** Number of tasks that have failed unrecoverably. */
  tasksFailed: number;
}
