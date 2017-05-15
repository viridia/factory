import * as Immutable from 'immutable';
import { Dispatch } from 'redux';
import { Action, handleAction, handleActions } from 'redux-actions';
import globals from '../globals';
import { SET_ACTIVE_SUBSCRIPTIONS, SET_JOB_SUBSCRIPTION } from './actionIds';
import { setActiveSubscriptions, setJobSubscription } from './actions';
import { jobsAdded, jobsDeleted, jobsUpdated, tasksCancelled, tasksUpdated } from './actions';
import {
  ActiveSubscriptions,
  ProjectSubscriptionMap,
  SubscriptionCallback,
} from './types/ActiveSubscriptions';

/** The initial state of this reducer. */
const initialState: ActiveSubscriptions = {
  projects: Immutable.Map<number, SubscriptionCallback>(),
  jobId: null,
  jobCallback: null,
};

// Action which updates the list of active subscriptions.
export function updateProjectSubscriptions(projectIds: Immutable.Set<number>) {
  return (dispatch: Dispatch<{}>, getState: () => any) => {
    const activeSubscriptions: ProjectSubscriptionMap = getState().subscriptions.projects;
    const updatedSubscriptions: ProjectSubscriptionMap =
        activeSubscriptions.withMutations(mutable => {
      // Remove any subscriptions that are not present in the list of projectIds.
      activeSubscriptions.forEach((callback, projectId) => {
        if (!projectIds.has(projectId)) {
          globals.deepstream.event.unsubscribe(`project.${projectId}.jobs`, callback);
          mutable.delete(projectId);
        }
      });
      // Add new subscriptions that are not present in the map of current active subscriptions.
      projectIds.forEach(projectId => {
        if (projectId !== undefined && !mutable.has(projectId)) {
          const callback = (resp: any) => {
            console.info('project message received', Object.getOwnPropertyNames(resp));
            if (resp.jobsAdded) {
              dispatch(jobsAdded(resp.jobsAdded));
            }
            if (resp.jobsUpdated) {
              dispatch(jobsUpdated(resp.jobsUpdated));
            }
            if (resp.jobsDeleted) {
              dispatch(jobsDeleted(resp.jobsDeleted));
            }
          };
          globals.deepstream.event.subscribe(`project.${projectId}.jobs`, callback);
          mutable.set(projectId, callback);
        }
      });
    });
    if (!updatedSubscriptions.equals(activeSubscriptions)) {
      dispatch(setActiveSubscriptions(updatedSubscriptions));
    }
    // This action isn't actually asynchronous, it's just complex and has side effects.
    return Promise.resolve();
  };
}

// Action which updates the list of active subscriptions.
export function updateJobSubscriptions(jobId: string) {
  return (dispatch: Dispatch<{}>, getState: () => any) => {
    const activeSubscriptions: ActiveSubscriptions = getState().subscriptions;
    if (jobId !== activeSubscriptions.jobId) {
      if (activeSubscriptions.jobId !== null) {
        globals.deepstream.event.unsubscribe(`jobs.${activeSubscriptions.jobId}`,
            activeSubscriptions.jobCallback);
      }
      if (jobId != null) {
        const callback = (resp: any) => {
          console.info('job message received:', Object.getOwnPropertyNames(resp));
          if (resp.tasksCancelled) {
            console.info('tasks cancelled:', resp.tasksCancelled.length);
            dispatch(tasksCancelled(resp.tasksCancelled));
          }
          if (resp.tasksUpdated) {
            console.info('tasks updated:', resp.tasksUpdated.length);
            dispatch(tasksUpdated(resp.tasksUpdated));
          }
        };
        globals.deepstream.event.subscribe(`jobs.${jobId}`, callback);
        dispatch(setJobSubscription([jobId, callback]));
      } else {
        dispatch(setJobSubscription([null, null]));
      }
    }
    // This action isn't actually asynchronous, it's just complex and has side effects.
    return Promise.resolve();
  };
}

/** Action handlers. */
const subscriptionsReducer = handleActions<ActiveSubscriptions>({
  [SET_ACTIVE_SUBSCRIPTIONS]:
      (state: ActiveSubscriptions, action: Action<ProjectSubscriptionMap>) =>
    ({ ...state, projects: action.payload }),
  [SET_JOB_SUBSCRIPTION]:
      (state: ActiveSubscriptions, action: Action<[string, SubscriptionCallback]>) =>
    ({ ...state, jobId: action.payload[0], jobCallback: action.payload[1] }),
}, initialState);

export default subscriptionsReducer;
