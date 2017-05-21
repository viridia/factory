import { applyMiddleware, combineReducers, createStore } from 'redux';
import thunk from 'redux-thunk';
import createJobStatusReducer from './createJobStatusReducer';
import jobLogsReducer from './jobLogsReducer';
import jobsReducer from './jobsReducer';
import recipesReducer from './recipesReducer';
import subscriptionsReducer from './subscriptionsReducer';
import taskLogsReducer from './taskLogsReducer';
import tasksReducer from './tasksReducer';

const store = createStore(combineReducers({
  jobs: jobsReducer,
  jobLogs: jobLogsReducer,
  createJobStatus: createJobStatusReducer,
  recipes: recipesReducer,
  subscriptions: subscriptionsReducer,
  tasks: tasksReducer,
  taskLogs: taskLogsReducer,
}), applyMiddleware(thunk));

export default store;
