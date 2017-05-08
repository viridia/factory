import { Task } from 'common/types/api';
import * as Immutable from 'immutable';

/** Data structure representing the list of jobs queried from the director server. */
export interface TaskQueryResult {
  list: string[];
  byId: Immutable.Map<string, Task>;
  error?: string;
  loading: boolean;
  selected: string;
}
