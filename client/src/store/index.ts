import { applyMiddleware, combineReducers, createStore } from 'redux';
import thunk from 'redux-thunk';
import createJobStatusReducer from './createJobStatusReducer';
import jobsListReducer from './jobsListReducer';

const store = createStore(combineReducers({
  jobs: jobsListReducer,
  createJobStatus: createJobStatusReducer,
}), applyMiddleware(thunk));

export default store;
