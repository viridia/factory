import { Job, JobQuery, JobRequest, Task } from 'api';
import { Action, createAction } from 'redux-actions';
import {
  CREATE_JOB_FAILED,
  CREATE_JOB_OK,
  CREATE_JOB_REQUESTED,
  JOB_LOGS_ERROR,
  JOB_LOGS_RECEIVED,
  JOB_LOGS_REQUESTED,
  JOBS_ADDED,
  JOBS_DELETED,
  JOBS_LIST_ERROR,
  JOBS_LIST_RECEIVED,
  JOBS_LIST_REQUESTED,
  JOBS_UPDATED,
  SELECT_JOB,
  SELECT_TASK,
  SET_ACTIVE_SUBSCRIPTIONS,
  SET_JOB_SUBSCRIPTION,
  TASK_LIST_CLEAR,
  TASK_LIST_ERROR,
  TASK_LIST_RECEIVED,
  TASK_LIST_REQUESTED,
  TASK_LOGS_ERROR,
  TASK_LOGS_RECEIVED,
  TASK_LOGS_REQUESTED,
  TASKS_CANCELLED,
  TASKS_UPDATED,
} from './actionIds';

export const creatRequested = createAction<undefined>(CREATE_JOB_REQUESTED);
export const creatOK = createAction<undefined>(CREATE_JOB_OK);
export const creatFailed = createAction<string>(CREATE_JOB_FAILED);
export const jobsAdded = createAction<Job[]>(JOBS_ADDED);
export const jobsDeleted = createAction<string[]>(JOBS_DELETED);
export const jobsUpdated = createAction<Job[]>(JOBS_UPDATED);
export const jobsListRequested = createAction<undefined>(JOBS_LIST_REQUESTED);
export const jobsListReceived = createAction<undefined>(JOBS_LIST_RECEIVED);
export const jobsListError = createAction<undefined>(JOB_LOGS_ERROR);
export const jobsLogsRequested = createAction<undefined>(JOB_LOGS_REQUESTED);
export const jobsLogsReceived = createAction<undefined>(JOB_LOGS_RECEIVED);
export const jobsLogsError = createAction<undefined>(JOBS_LIST_ERROR);
export const selectJob = createAction<string>(SELECT_JOB);
export const selectTask = createAction<string>(SELECT_TASK);
export const setActiveSubscriptions = createAction<undefined>(SET_ACTIVE_SUBSCRIPTIONS);
export const setJobSubscription = createAction<undefined>(SET_JOB_SUBSCRIPTION);
export const taskListClear = createAction<undefined>(TASK_LIST_CLEAR);
export const taskListRequested = createAction<undefined>(TASK_LIST_REQUESTED);
export const taskListReceived = createAction<undefined>(TASK_LIST_RECEIVED);
export const taskListError = createAction<undefined>(JOBS_LIST_ERROR);
export const taskLogsRequested = createAction<undefined>(TASK_LOGS_REQUESTED);
export const taskLogsReceived = createAction<undefined>(TASK_LOGS_RECEIVED);
export const taskLogsError = createAction<undefined>(JOB_LOGS_ERROR);
export const tasksCancelled = createAction<string[]>(TASKS_CANCELLED);
export const tasksUpdated = createAction<Task[]>(TASKS_UPDATED);
