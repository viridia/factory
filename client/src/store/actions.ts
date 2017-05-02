import { Job, JobRequest } from 'common/types';
import { Action, createAction } from 'redux-actions';
import {
  CREATE_JOB_FAILED,
  CREATE_JOB_OK,
  CREATE_JOB_REQUESTED,
  RECEIVE_JOBS_ERROR,
  RECEIVE_JOBS_LIST,
  REQUEST_JOBS_LIST,
  SELECT_JOB,
  SET_ACTIVE_SUBSCRIPTIONS,
} from './actionIds';
import { JobQuery } from './types/JobQuery';

export const createJobRequested = createAction<undefined>(CREATE_JOB_REQUESTED);
export const createJobOK = createAction<undefined>(CREATE_JOB_OK);
export const createJobFailed = createAction<string>(CREATE_JOB_FAILED);
export const selectJobs = createAction<JobQuery>(SELECT_JOB);
export const requestJobsList = createAction<undefined>(REQUEST_JOBS_LIST);
export const receiveJobsList = createAction<undefined>(RECEIVE_JOBS_LIST);
export const receiveJobsError = createAction<undefined>(RECEIVE_JOBS_ERROR);
export const setActiveSubscriptions = createAction<undefined>(SET_ACTIVE_SUBSCRIPTIONS);
