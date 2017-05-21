import { Recipe } from 'api';
import * as Immutable from 'immutable';

/** Data structure representing the list of jobs queried from the director server. */
export interface RecipeQueryResult {
  list: string[];
  byId: Immutable.Map<string, Recipe>;
  error?: string;
  loaded: boolean;
  loading: boolean;
  selected: string;
}
