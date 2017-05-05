/** A request to modify a job. */
export interface JobChangeRequest {
  /** If present, indicates that the job should be paused or not. */
  paused?: boolean;

  /** If present and true, indicates that the job should be canceled. */
  canceled?: boolean;
}
