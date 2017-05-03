/** A request to create a job. */
export interface JobRequest {
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
}
