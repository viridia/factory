import { applyMiddleware, combineReducers, createStore } from 'redux';
import thunk from 'redux-thunk';
import jobsReducer from './jobsReducer';
// import appstreamStatusReducer from './appstream';
// import backendStatusReducer from './backend';
// import authStatusReducer from './auth';
// import computeStatusReducer from './compute';
// import frontendStatusReducer from './frontend';

const store = createStore(combineReducers({
  jobs: jobsReducer,
  // backend: backendStatusReducer,
  // auth: authStatusReducer,
  // compute: computeStatusReducer,
  // frontend: frontendStatusReducer,
}), applyMiddleware(thunk));

export default store;
