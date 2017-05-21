import { LogEntry } from 'api';
import axios, { AxiosError, AxiosResponse } from 'axios';
import { Dispatch } from 'redux';
import { Action, handleActions } from 'redux-actions';
import {
  TASK_LOGS_ERROR,
  TASK_LOGS_RECEIVED,
  TASK_LOGS_REQUESTED,
  TASK_WORKLOGS_RECEIVED,
} from './actionIds';
import {
  taskLogsError,
  taskLogsReceived,
  taskLogsRequested,
  taskWorkLogsReceived,
} from './actions';
import { LogsQueryResult } from './types/LogsQueryResult';

/** The initial state of this reducer. */
const initialState: LogsQueryResult = {
  error: null,
  entries: [],
  workerEntries: [],
  loading: false,
};

// // Async action which retrieves the job logs.
export function fetchTaskLogs(jobId: string, taskId: string) {
  return (dispatch: Dispatch<{}>, getState: () => LogsQueryResult) => {
    // Update the store to indicate that we're in the process of loading
    dispatch(taskLogsRequested());
    // Request job list from backend.
    const cancel = axios.CancelToken.source();
    const promises = [
      axios.get(`/api/v1/jobs/${jobId}/tasks/${taskId}/logs`)
      .then((resp: AxiosResponse) => {
        // Update the store.
        dispatch(taskLogsReceived(resp.data));
      }, (error: AxiosError) => {
        // Signal an error.
        if (error.response) {
          dispatch(taskLogsError(error.response.statusText));
        } else {
          dispatch(taskLogsError(error.message));
        }
      }),
      axios.get(`/api/v1/jobs/${jobId}/tasks/${taskId}/wkrlogs`, { cancelToken: cancel.token })
      .then((resp: AxiosResponse) => {
        dispatch(taskWorkLogsReceived(resp.data.split('\n')));
      }, (error: AxiosError) => {
        console.log(error);
        // Signal an error.
        if (error.response) {
          dispatch(taskLogsError(error.response.statusText));
        } else {
          dispatch(taskLogsError(error.message));
        }
      }),
    ];
    // cancel.cancel();
    return Promise.all(promises);
  };
}

/** Action handlers. */
const taskLogsReducer = handleActions<LogsQueryResult>({
  [TASK_LOGS_REQUESTED]: (state: LogsQueryResult) => ({ ...state, loading: true, error: null }),
  [TASK_LOGS_RECEIVED]: (state: LogsQueryResult, action: Action<LogEntry[]>) => {
    return {
      ...state,
      entries: action.payload.map(entry => ({ date: new Date(entry.date), ...entry })),
      loading: false,
    };
  },
  [TASK_WORKLOGS_RECEIVED]: (state: LogsQueryResult, action: Action<string[]>) => {
    return {
      ...state,
      error: null,
      workerEntries: action.payload || [],
    };
  },
  [TASK_LOGS_ERROR]: (state: LogsQueryResult, action: Action<string>) => {
    return { ...state, loading: false, error: action.payload };
  },
}, initialState);

export default taskLogsReducer;
