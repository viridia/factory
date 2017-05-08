/** The execution state of a job or task. */
export enum RunState {
  WAITING,    // Waiting on dependencies
  READY,      // Ready to run but has not run yet
  RUNNING,
  COMPLETED,  // Finished successfully
  CANCELLING, // Cancel requested
  CANCELLED,  // Cancel complete
  FAILED,     // Failure
}
