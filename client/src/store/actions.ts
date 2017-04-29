import { Action, createAction } from 'redux-actions';
import {
  CREATE_JOB,
  QUERY_JOBS,
} from './actionTypes';
import { Job } from './types/Job';

const createJob = createAction<Job>(CREATE_JOB);
const queryJobs = createAction<Job>(QUERY_JOBS);

export {
  createJob,
  queryJobs,
};
