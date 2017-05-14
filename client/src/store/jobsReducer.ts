import { Job, JobQuery, JobRequest } from 'api';
import axios, { AxiosError, AxiosResponse } from 'axios';
import * as Immutable from 'immutable';
import { Dispatch } from 'redux';
import { Action, handleActions } from 'redux-actions';
import {
  JOBS_ADDED,
  JOBS_DELETED,
  JOBS_LIST_ERROR,
  JOBS_LIST_RECEIVED,
  JOBS_LIST_REQUESTED,
  JOBS_UPDATED,
  SELECT_JOB,
} from './actionIds';
import {
  jobsListError,
  jobsListReceived,
  jobsListRequested,
} from './actions';
import { JobQueryResult } from './types/JobQueryResult';

/** The initial state of this reducer. */
const initialState: JobQueryResult = {
  byId: Immutable.Map<string, Job>(),
  byProject: Immutable.Map<number, Immutable.Map<string, Job>>(),
  error: null,
  list: [],
  loading: false,
  selected: null,
};

// Async action which retrieves the job list.
export function fetchJobs(query: JobQuery = {}) {
  return (dispatch: Dispatch<{}>, getState: () => JobQueryResult) => {
    // See if the status is already loaded.
    // TODO: save the query params and only refetch if they changed.
    // const status = getState().backend.get(zone);
    // // If we're alredy loading, don't re-load, just return a fulfilled promise.
    // if (status) {
    //   return Promise.resolve();
    // }
    // Update the store to indicate that we're in the process of loading
    dispatch(jobsListRequested());
    // Request job list from backend.
    return axios.get('/api/v1/jobs', { params: query })
    .then((resp: AxiosResponse) => {
      // Update the store.
      dispatch(jobsListReceived(resp.data));
    }, (error: AxiosError) => {
      // Signal an error.
      if (error.response) {
        dispatch(jobsListError(error.response.statusText));
      } else {
        dispatch(jobsListError(error.message));
      }
    });
  };
}

// Async action which cancels a job.
export function cancelJob(jobId: string) {
  return (dispatch: Dispatch<{}>, getState: () => JobQueryResult) => {
    return axios.patch(`/api/v1/jobs/${jobId}`, {
      cancelled: true,
    }).catch((error: AxiosError) => {
      console.error(error);
      // TODO: Display error toast.
      // // Signal an error.
      // if (error.response) {
      //   dispatch(jobsListError(error.response.statusText));
      // } else {
      //   dispatch(jobsListError(error.message));
      // }
    });
  };
}

// Async action which cancels a job.
export function deleteJob(jobId: string) {
  return (dispatch: Dispatch<{}>, getState: () => JobQueryResult) => {
    return axios.delete(`/api/v1/jobs/${jobId}`).catch((error: AxiosError) => {
      console.error(error);
      // TODO: Display error toast.
      // // Signal an error.
      // if (error.response) {
      //   dispatch(jobsListError(error.response.statusText));
      // } else {
      //   dispatch(jobsListError(error.message));
      // }
    });
  };
}

/** Action handlers. */
const jobsReducer = handleActions<JobQueryResult>({
  [JOBS_LIST_REQUESTED]: (state: JobQueryResult) => ({ ...state, loading: true, error: null }),
  [JOBS_LIST_RECEIVED]: (state: JobQueryResult, action: Action<[Job]>) => {
    const byId = Immutable.Map(action.payload.map(job => [job.id, job]));
    const byProject = byId.groupBy((job: Job) => job.project);
    return {
      ...state,
      byId,
      byProject,
      error: null,
      list: action.payload.map(job => job.id),
      loading: false,
    };
  },
  [JOBS_LIST_ERROR]: (state: JobQueryResult, action: Action<string>) => {
    return { ...state, loading: false, error: action.payload };
  },
  [JOBS_ADDED]: (state: JobQueryResult, action: Action<Job[]>) => {
    let byId = state.byId;
    let list = state.list;
    for (const job of action.payload) {
      if (!byId.has(job.id)) {
        list = [job.id, ...list];
      }
      byId = byId.set(job.id, job);
    }
    return { ...state, byId, list };
  },
  [JOBS_UPDATED]: (state: JobQueryResult, action: Action<Job[]>) => {
    let byId = state.byId;
    for (const job of action.payload) {
      // byId = byId.set(job.id, { ...byId.get(job.id), ...job }); // Merge?
      byId = byId.set(job.id, job);
    }
    if (byId === state.byId) {
      return state;
    }
    return { ...state, byId };
  },
  [JOBS_DELETED]: (state: JobQueryResult, action: Action<string[]>) => {
    let byId = state.byId;
    let selected = state.selected;
    for (const jobId of action.payload) {
      byId = byId.delete(jobId);
      if (selected === jobId) {
        selected = null;
      }
    }
    return { ...state, byId, selected, list: state.list.filter(id => byId.has(id)) };
  },
  [SELECT_JOB]: (state: JobQueryResult, action: Action<number>) => {
    return { ...state, selected: action.payload };
  },
}, initialState);

export default jobsReducer;
