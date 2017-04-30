import { Job } from 'common/types/Job';
import * as Immutable from 'immutable';

/** Data structure representing the list of jobs queried from the director server. */
export interface JobList {
  list: Immutable.List<number>;
  byId: Immutable.Map<number, Job>;
  error?: string;
  loading: boolean;
  selected: number;
}
