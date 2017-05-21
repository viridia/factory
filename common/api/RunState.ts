/** The execution state of a job or task. */
export enum RunState {
  // Active states. Note order is important because we use < to determine active.
  READY,      // Ready to run but has not run yet
  RUNNING,
  CANCELLING, // Cancel requested
  FAILING,    // In the process of failing

  // Passive states
  WAITING,    // Waiting on dependencies
  COMPLETED,  // Finished successfully
  CANCELLED,  // Cancel complete
  FAILED,     // Failure
}
