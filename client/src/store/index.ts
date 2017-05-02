import { applyMiddleware, combineReducers, createStore } from 'redux';
import thunk from 'redux-thunk';
import createJobStatusReducer from './createJobStatusReducer';
import jobsReducer from './jobsReducer';
import subscriptionsReducer from './subscriptionsReducer';

const store = createStore(combineReducers({
  jobs: jobsReducer,
  createJobStatus: createJobStatusReducer,
  subscriptions: subscriptionsReducer,
}), applyMiddleware(thunk));

export default store;
