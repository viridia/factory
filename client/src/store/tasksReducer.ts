import axios, { AxiosError, AxiosResponse } from 'axios';
import { RunState, Task  } from 'common/types/api';
import * as Immutable from 'immutable';
import { Dispatch } from 'redux';
import { Action, handleActions } from 'redux-actions';
import { TaskQueryResult } from '../store/types/TaskQueryResult';
import {
  SELECT_TASK,
  TASK_LIST_CLEAR,
  TASK_LIST_ERROR,
  TASK_LIST_RECEIVED,
  TASK_LIST_REQUESTED,
  TASKS_CANCELLED,
  TASKS_UPDATED,
} from './actionIds';
import {
  taskListError,
  taskListReceived,
  taskListRequested,
} from './actions';

/** The initial state of this reducer. */
const initialState: TaskQueryResult = {
  byId: Immutable.Map<string, Task>(),
  error: null,
  list: [],
  loading: false,
  selected: null,
};

// Async action which retrieves the job list.
export function fetchTasks(jobId: string) {
  return (dispatch: Dispatch<{}>, getState: () => TaskQueryResult) => {
    // Update the store to indicate that we're in the process of loading
    dispatch(taskListRequested());
    // Request job list from backend.
    return axios.get(`/api/v1/jobs/${jobId}/tasks`)
    .then((resp: AxiosResponse) => {
      // Update the store.
      dispatch(taskListReceived(resp.data));
    }, (error: AxiosError) => {
      // Signal an error.
      if (error.response) {
        dispatch(taskListError(error.response.statusText));
      } else {
        dispatch(taskListError(error.message));
      }
    });
  };
}

/** Action handlers. */
const tasksReducer = handleActions<TaskQueryResult>({
  [TASK_LIST_REQUESTED]: (state: TaskQueryResult) => ({ ...state, loading: true, error: null }),
  [TASK_LIST_RECEIVED]: (state: TaskQueryResult, action: Action<[Task]>) => {
    const byId = Immutable.Map(action.payload.map(task => [task.id, task]));
    return {
      ...state,
      byId,
      error: null,
      list: action.payload.map(task => task.id),
      loading: false,
    };
  },
  [TASK_LIST_ERROR]: (state: TaskQueryResult, action: Action<string>) => {
    return { ...state, loading: false, error: action.payload };
  },
  [TASK_LIST_CLEAR]: (state: TaskQueryResult, action: Action<{}>) => {
    return { ...state, loading: false, error: null, list: [], byId: initialState.byId };
  },
  [TASKS_UPDATED]: (state: TaskQueryResult, action: Action<Task[]>) => {
    let byId = state.byId;
    console.log('tasks updated:', action.payload.map(task => task.id));
    for (const task of action.payload) {
      // byId = byId.set(job.id, { ...byId.get(job.id), ...job }); // Merge?
      if (byId.has(task.id)) {
        byId = byId.set(task.id, task);
      }
    }
    if (byId === state.byId) {
      return state;
    }
    return { ...state, byId };
  },
  [TASKS_CANCELLED]: (state: TaskQueryResult, action: Action<string[]>) => {
    let byId = state.byId;
    console.log('tasks cancelled:', action.payload);
    for (const taskId of action.payload) {
      // byId = byId.set(job.id, { ...byId.get(job.id), ...job }); // Merge?
      const task = byId.get(taskId);
      if (task && (task.state === RunState.WAITING || task.state === RunState.RUNNING)) {
        byId = byId.set(taskId, { ...task, state: RunState.CANCELLED });
      }
    }
    if (byId === state.byId) {
      return state;
    }
    return { ...state, byId };
  },
  // [TASKS_DELETED]: (state: TaskQueryResult, action: Action<string[]>) => {
  //   let byId = state.byId;
  //   let selected = state.selected;
  //   for (const jobId of action.payload) {
  //     byId = byId.delete(jobId);
  //     if (selected === jobId) {
  //       selected = null;
  //     }
  //   }
  //   return { ...state, byId, selected, list: state.list.filter(id => byId.has(id)) };
  // },
  [SELECT_TASK]: (state: TaskQueryResult, action: Action<number>) => {
    return { ...state, selected: action.payload };
  },
}, initialState);

export default tasksReducer;
