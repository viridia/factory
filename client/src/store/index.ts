import { applyMiddleware, combineReducers, createStore } from 'redux';
import thunk from 'redux-thunk';
import createJobStatusReducer from './createJobStatusReducer';
import jobLogsReducer from './jobLogsReducer';
import jobsReducer from './jobsReducer';
import subscriptionsReducer from './subscriptionsReducer';
import tasksReducer from './tasksReducer';

const store = createStore(combineReducers({
  jobs: jobsReducer,
  jobLogs: jobLogsReducer,
  createJobStatus: createJobStatusReducer,
  subscriptions: subscriptionsReducer,
  tasks: tasksReducer,
}), applyMiddleware(thunk));

export default store;
