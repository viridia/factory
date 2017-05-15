import { LogEntry } from 'api';
import axios, { AxiosError, AxiosResponse } from 'axios';
import { Dispatch } from 'redux';
import { Action, handleActions } from 'redux-actions';
import {
  JOB_LOGS_ERROR,
  JOB_LOGS_RECEIVED,
  JOB_LOGS_REQUESTED,
//   JOBS_UPDATED,
} from './actionIds';
import {
  jobsLogsError,
  jobsLogsReceived,
  jobsLogsRequested,
} from './actions';
import { LogsQueryResult } from './types/LogsQueryResult';

/** The initial state of this reducer. */
const initialState: LogsQueryResult = {
  error: null,
  entries: [],
  loading: false,
};

// // Async action which retrieves the job logs.
export function fetchJobLogs(jobId: string) {
  return (dispatch: Dispatch<{}>, getState: () => LogsQueryResult) => {
    // Update the store to indicate that we're in the process of loading
    dispatch(jobsLogsRequested());
    // Request job list from backend.
    return axios.get(`/api/v1/jobs/${jobId}/logs`)
    .then((resp: AxiosResponse) => {
      // Update the store.
      dispatch(jobsLogsReceived(resp.data));
    }, (error: AxiosError) => {
      // Signal an error.
      if (error.response) {
        dispatch(jobsLogsError(error.response.statusText));
      } else {
        dispatch(jobsLogsError(error.message));
      }
    });
  };
}

/** Action handlers. */
const jobLogsReducer = handleActions<LogsQueryResult>({
  [JOB_LOGS_REQUESTED]: (state: LogsQueryResult) => ({ ...state, loading: true, error: null }),
  [JOB_LOGS_RECEIVED]: (state: LogsQueryResult, action: Action<[LogEntry]>) => {
    return {
      ...state,
      error: null,
      entries: action.payload.map(entry => ({ date: new Date(entry.date), ...entry })),
      loading: false,
    };
  },
  [JOB_LOGS_ERROR]: (state: LogsQueryResult, action: Action<string>) => {
    return { ...state, loading: false, error: action.payload };
  },
//   [JOB_LOGS_UPDATED]: (state: LogsQueryResult, action: Action<Job[]>) => {
//     return { ...state, byId };
//   },
}, initialState);

export default jobLogsReducer;
