import { Job } from 'api';
import * as Immutable from 'immutable';

/** Data structure representing the list of jobs queried from the director server. */
export interface JobQueryResult {
  list: string[];
  byId: Immutable.Map<string, Job>;
  byProject: Immutable.Map<number, Immutable.Map<string, Job>>;
  error?: string;
  loading: boolean;
  selected: string;
}
