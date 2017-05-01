import axios, { AxiosError, AxiosResponse } from 'axios';
import { JobRequest } from 'common/types';
import { Dispatch } from 'redux';
import { Action, handleAction, handleActions } from 'redux-actions';
import {
  CREATE_JOB_FAILED,
  CREATE_JOB_OK,
  CREATE_JOB_REQUESTED,
} from './actionIds';
import {
  createJobFailed,
  createJobOK,
  createJobRequested,
} from './actions';
import { CreateJobStatus } from './types/CreateJobStatus';

/** The initial state of this reducer. */
const initialState: CreateJobStatus = {
  error: null,
  busy: false,
};

// Async action which creates a new job.
export function createJob(request: JobRequest) {
  return (dispatch: Dispatch<{}>, getState: () => {}) => {
    dispatch(createJobRequested());
    return axios.post('/api/v1/jobs', request)
    .then((resp: AxiosResponse) => {
      // Update the store.
      console.debug(resp.data);
      dispatch(createJobOK(resp.data));
    }, (error: AxiosError) => {
      // Signal an error.
      console.error('create job failed:', error);
      if (error.response) {
        dispatch(createJobFailed(error.response.statusText));
      } else {
        dispatch(createJobFailed(error.message));
      }
    });
  };
}

/** Action handlers. */
const createJobReducer = handleActions<CreateJobStatus>({
  [CREATE_JOB_REQUESTED]: (state: CreateJobStatus) => ({ ...state, busy: true }),
  [CREATE_JOB_OK]: (state: CreateJobStatus) => ({ error: null, busy: false }),
  [CREATE_JOB_FAILED]: (state: CreateJobStatus, action: Action<string>) => {
    return { busy: false, error: action.payload };
  },
}, initialState);

export default createJobReducer;
