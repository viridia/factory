import { Recipe, RecipeQuery } from 'api';
import axios, { AxiosError, AxiosResponse } from 'axios';
import * as Immutable from 'immutable';
import { Dispatch } from 'redux';
import { Action, handleActions } from 'redux-actions';
import {
  RECIPES_LIST_ERROR,
  RECIPES_LIST_RECEIVED,
  RECIPES_LIST_REQUESTED,
} from './actionIds';
import {
  recipesListError,
  recipesListReceived,
  recipesListRequested,
} from './actions';
import { RecipeQueryResult } from './types/RecipeQueryResult';

/** The initial state of this reducer. */
const initialState: RecipeQueryResult = {
  byId: Immutable.Map<string, Recipe>(),
  error: null,
  list: [],
  loaded: false,
  loading: false,
  selected: null,
};

// Async action which retrieves the recipe list.
export function fetchRecipes(query: RecipeQuery = {}) {
  return (dispatch: Dispatch<{}>, getState: () => RecipeQueryResult) => {
    // Update the store to indicate that we're in the process of loading
    dispatch(recipesListRequested());
    // Request recipe list from backend.
    return axios.get('/api/v1/recipes', { params: query })
    .then((resp: AxiosResponse) => {
      // Update the store.
      dispatch(recipesListReceived(resp.data));
    }, (error: AxiosError) => {
      // Signal an error.
      if (error.response) {
        dispatch(recipesListError(error.response.statusText));
      } else {
        dispatch(recipesListError(error.message));
      }
    });
  };
}

/** Action handlers. */
const recipesReducer = handleActions<RecipeQueryResult>({
  [RECIPES_LIST_REQUESTED]: (state: RecipeQueryResult) =>
      ({ ...state, loading: true, error: null }),
  [RECIPES_LIST_RECEIVED]: (state: RecipeQueryResult, action: Action<[Recipe]>) => {
    const byId = Immutable.Map(action.payload.map(recipe => [recipe.id, recipe]));
    return {
      ...state,
      byId,
      error: null,
      list: action.payload.map(recipe => recipe.id),
      loading: false,
      loaded: true,
    };
  },
  [RECIPES_LIST_ERROR]: (state: RecipeQueryResult, action: Action<string>) => {
    return { ...state, loading: false, error: action.payload };
  },
}, initialState);

export default recipesReducer;
