import axios, { AxiosError, AxiosResponse } from 'axios';
import { LogEntry } from 'common/types/api';
import { Dispatch } from 'redux';
import { Action, handleActions } from 'redux-actions';
import {
  JOBS_LOGS_ERROR,
  JOBS_LOGS_RECEIVED,
  JOBS_LOGS_REQUESTED,
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
  [JOBS_LOGS_REQUESTED]: (state: LogsQueryResult) => ({ ...state, loading: true, error: null }),
  [JOBS_LOGS_RECEIVED]: (state: LogsQueryResult, action: Action<[LogEntry]>) => {
    return {
      ...state,
      error: null,
      entries: action.payload,
      loading: false,
    };
  },
  [JOBS_LOGS_ERROR]: (state: LogsQueryResult, action: Action<string>) => {
    return { ...state, loading: false, error: action.payload };
  },
//   [JOBS_LOGS_UPDATED]: (state: LogsQueryResult, action: Action<Job[]>) => {
//     return { ...state, byId };
//   },
}, initialState);

export default jobLogsReducer;
