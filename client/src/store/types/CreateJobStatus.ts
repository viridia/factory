import { Job } from 'common/types/api';
import * as Immutable from 'immutable';

/** Data structure representing the state of a job creation request. */
export interface CreateJobStatus {
  error?: string;
  busy: boolean; // Set while job request is being processed.
}
