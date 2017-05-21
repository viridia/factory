import { Job } from './Job';

/** Declares the type of a pub/sub notification of status change. */
export interface JobChangeNotification {
  jobsAdded?: Job[];
  jobsUpdated?: Job[];
  jobsDeleted?: string[];
}
