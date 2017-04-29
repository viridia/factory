import { handleActions } from 'redux-actions';
import { queryJobs } from './actions';

const reducer = handleActions({
  // [queryJobs]: (state, query) => {
  // },
}, { jobs: [] });
