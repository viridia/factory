import * as Immutable from 'immutable';
import * as React from 'react';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import { fetchJobs } from '../store/jobsReducer';
import { Job } from '../store/types/Job';
import { JobList as JobListState } from '../store/types/JobList';
import './JobList.scss';
import JobListEntry from './JobListEntry';

interface JobsListProps {
  jobs: JobListState;
  dispatch: Dispatch<{}>;
}

/** Displays the current list of jobs. */
class JobList extends React.Component<JobsListProps, undefined> {
  public componentWillMount() {
    const { jobs, dispatch } = this.props;
    dispatch(fetchJobs());
  }

  public renderListContent() {
    const { list, byId, error, loading, selected } = this.props.jobs;
    if (error) {
      return <div className="error">{error}</div>;
    } else if (list.size > 0) {
      return (
        <table className="job-list-table">
          <thead>
            <th>ID</th>
            <th>User</th>
            <th>File</th>
          </thead>
          <tbody>
            {list.map(id => <JobListEntry jobId={id} selected={id === selected} />)}
          </tbody>
        </table>
      );
    } else if (loading) {
      return <div className="loading">Loading...</div>;
    } else {
      return <div className="empty-list">No Current Jobs</div>;
    }
  }

  public render() {
    const { jobs } = this.props;
    return (
      <section className="items">{this.renderListContent()}</section>
    );
  }
}

export default connect(
  state => ({ jobs: state.jobs }),
)(JobList);
