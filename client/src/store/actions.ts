import { Job } from 'common/types/Job';
import { Action, createAction } from 'redux-actions';
import {
  CREATE_JOB,
  RECEIVE_JOBS_ERROR,
  RECEIVE_JOBS_LIST,
  REQUEST_JOBS_LIST,
  SELECT_JOB,
} from './actionIds';
import { JobQuery } from './types/JobQuery';

const createJob = createAction<Job>(CREATE_JOB);
const selectJobs = createAction<JobQuery>(SELECT_JOB);
const requestJobsList = createAction<undefined>(REQUEST_JOBS_LIST);
const receiveJobsList = createAction<undefined>(RECEIVE_JOBS_LIST);
const receiveJobsError = createAction<undefined>(RECEIVE_JOBS_ERROR);

export {
  createJob,
  selectJobs,
  requestJobsList,
  receiveJobsList,
  receiveJobsError,
};
