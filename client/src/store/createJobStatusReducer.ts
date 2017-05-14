import { JobRequest } from 'api';
import axios, { AxiosError, AxiosResponse } from 'axios';
import { Dispatch } from 'redux';
import { Action, handleAction, handleActions } from 'redux-actions';
import {
  CREATE_JOB_FAILED,
  CREATE_JOB_OK,
  CREATE_JOB_REQUESTED,
} from './actionIds';
import {
  creatFailed,
  creatOK,
  creatRequested,
} from './actions';
import { CreateJobStatus } from './types/CreateJobStatus';

/** The initial state of this reducer. */
const initialState: CreateJobStatus = {
  error: null,
  busy: false,
};

// Async action which creates a new job.
export function create(request: JobRequest) {
  return (dispatch: Dispatch<{}>, getState: () => {}) => {
    dispatch(creatRequested());
    return axios.post('/api/v1/jobs', request)
    .then((resp: AxiosResponse) => {
      // Update the store.
      dispatch(creatOK(resp.data));
    }, (error: AxiosError) => {
      // Signal an error.
      if (error.response) {
        console.error('create job failed:', error.response.data);
        dispatch(creatFailed(error.response.statusText));
      } else {
        console.error('create job failed:', error);
        dispatch(creatFailed(error.message));
      }
    });
  };
}

/** Action handlers. */
const creatReducer = handleActions<CreateJobStatus>({
  [CREATE_JOB_REQUESTED]: (state: CreateJobStatus) => ({ ...state, busy: true }),
  [CREATE_JOB_OK]: (state: CreateJobStatus) => ({ error: null, busy: false }),
  [CREATE_JOB_FAILED]: (state: CreateJobStatus, action: Action<string>) => {
    return { busy: false, error: action.payload };
  },
}, initialState);

export default creatReducer;
