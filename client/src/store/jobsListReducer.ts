import axios, { AxiosError, AxiosResponse } from 'axios';
import { Job, JobRequest } from 'common/types';
import * as Immutable from 'immutable';
import { Dispatch } from 'redux';
import { Action, handleAction, handleActions } from 'redux-actions';
import {
  RECEIVE_JOBS_ERROR,
  RECEIVE_JOBS_LIST,
  REQUEST_JOBS_LIST,
  SELECT_JOB,
} from './actionIds';
import {
  receiveJobsError,
  receiveJobsList,
  requestJobsList,
} from './actions';
import { JobList } from './types/JobList';
import { JobQuery } from './types/JobQuery';

/** The initial state of this reducer. */
const initialState: JobList = {
  byId: Immutable.Map<number, Job>(),
  error: null,
  list: Immutable.List<number>(),
  loading: false,
  selected: -1,
};

// Async action which retrieves the job list.
export function fetchJobs(query: JobQuery = {}) {
  return (dispatch: Dispatch<{}>, getState: () => JobList) => {
    // See if the status is already loaded.
    // TODO: save the query params and only refetch if they changed.
    // const status = getState().backend.get(zone);
    // // If we're alredy loading, don't re-load, just return a fulfilled promise.
    // if (status) {
    //   return Promise.resolve();
    // }
    // Update the store to indicate that we're in the process of loading
    dispatch(requestJobsList());
    // Request job list from backend.
    return axios.get('/api/v1/jobs', { params: query })
    .then((resp: AxiosResponse) => {
      // Update the store.
      dispatch(receiveJobsList(resp.data));
    }, (error: AxiosError) => {
      // Signal an error.
      if (error.response) {
        dispatch(receiveJobsError(error.response.statusText));
      } else {
        dispatch(receiveJobsError(error.message));
      }
    });
  };
}

/** Action handlers. */
const jobsReducer = handleActions<JobList>({
  [REQUEST_JOBS_LIST]: (state: JobList) => ({ ...state, loading: true, error: null }),
  [RECEIVE_JOBS_LIST]: (state: JobList, action: Action<[Job]>) => {
    const byId = Immutable.Map(action.payload.map(job => [job.id, job]));
    return {
      ...state,
      byId: Immutable.Map(action.payload.map(job => [job.id, job])),
      error: null,
      list: Immutable.List(action.payload.map(job => job.id)),
      loading: false,
    };
  },
  [RECEIVE_JOBS_ERROR]: (state: JobList, action: Action<string>) => {
    return { ...state, loading: false, error: action.payload };
  },
  [SELECT_JOB]: (state: JobList, action: Action<number>) => {
    return { ...state, selected: action.payload };
  },
}, initialState);

export default jobsReducer;
