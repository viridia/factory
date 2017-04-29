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
  id: number;

  /** The id of the user that submitted this job. */
  user: string;

  /** The project id. */
  project: number;

  /** The asset id. */
  asset: number;

  /** The name of the main input file. */
  mainFileName: string;

  /** The name of the recipe to execute for this job. */
  recipe: string;

  /** The title of the recipe. */
  recipeTitle: string;

  /** The current execution state of the job. */
  state: JobState;

  /** Timestamp when the job was initially created. */
  createdAt: Date;

  /** Timestamp when the job started running. */
  startedAt: Date;

  /** Timestamp when the job completed (either succesfully or not). */
  endedAt: Date;
}
