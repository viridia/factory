import * as Immutable from 'immutable';
import { Dispatch } from 'redux';
import { Action, handleAction, handleActions } from 'redux-actions';
import globals from '../globals';
import { SET_ACTIVE_SUBSCRIPTIONS } from './actionIds';
import { setActiveSubscriptions } from './actions';
import { jobsAdded, jobsDeleted, jobsUpdated } from './actions';
import {
  ActiveSubscriptions,
  SubscriptionCallback,
  SubscriptionMap,
} from './types/ActiveSubscriptions';

/** The initial state of this reducer. */
const initialState: ActiveSubscriptions = {
  projects: Immutable.Map<number, SubscriptionCallback>(),
};

// Action which updates the list of active subscriptions.
export function updateProjectSubscriptions(projectIds: Immutable.Set<number>) {
  return (dispatch: Dispatch<{}>, getState: () => any) => {
    const activeSubscriptions: SubscriptionMap = getState().subscriptions.projects;
    const updatedSubscriptions: SubscriptionMap = activeSubscriptions.withMutations(mutable => {
      // Remove any subscriptions that are not present in the list of projectIds.
      activeSubscriptions.forEach((callback, projectId) => {
        if (!projectIds.has(projectId)) {
          globals.deepstream.event.unsubscribe(`jobs.project.${projectId}`, callback);
          mutable.delete(projectId);
          console.info('removing subscription:', projectId);
        }
      });
      // Add new subscriptions that are not present in the map of current active subscriptions.
      projectIds.forEach(projectId => {
        if (projectId !== undefined && !mutable.has(projectId)) {
          const callback = (resp: any) => {
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
          globals.deepstream.event.subscribe(`jobs.project.${projectId}`, callback);
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

/** Action handlers. */
const subscriptionsReducer = handleActions<ActiveSubscriptions>({
  [SET_ACTIVE_SUBSCRIPTIONS]: (state: ActiveSubscriptions, action: Action<[SubscriptionMap]>) =>
    ({ ...state, projects: action.payload }),
}, initialState);

export default subscriptionsReducer;
