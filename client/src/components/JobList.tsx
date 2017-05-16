import { Job } from 'api';
import * as Immutable from 'immutable';
import * as React from 'react';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import { selectJob } from '../store/actions';
import { fetchJobs } from '../store/jobsReducer';
import { updateProjectSubscriptions } from '../store/subscriptionsReducer';
import { JobQueryResult } from '../store/types/JobQueryResult';
import './JobList.scss';
import JobListItem from './JobListItem';

interface MappedProps {
  jobs: JobQueryResult;
  dispatch: Dispatch<{}>;
  selectJob: (jobId: string) => void;
}

function compareJobs(a: Job, b: Job) {
  if (a.createdAt < b.createdAt) {
    return 1;
  } else if (a.createdAt > b.createdAt) {
    return -1;
  } else {
    return 0;
  }
}

/** Displays the current list of jobs. */
class JobList extends React.Component<MappedProps, undefined> {
  constructor() {
    super();
    this.onClick = this.onClick.bind(this);
  }

  public componentWillMount() {
    const { jobs, dispatch } = this.props;
    dispatch(fetchJobs());
  }

  public componentWillReceiveProps(nextProps: MappedProps) {
    const { jobs } = nextProps;
    const projectIds = Immutable.Set<number>(jobs.byProject.keySeq());
    const currentProject = 10; // Also watch for new jobs in current project.
    // We probably also need a per-user channel.
    this.props.dispatch(updateProjectSubscriptions(projectIds.add(currentProject)));
  }

  public renderListContent() {
    const { list, byId, error, loading, selected } = this.props.jobs;
    const jobList = list.map(id => byId.get(id)).sort(compareJobs);
    if (error) {
      return <div className="error">{error}</div>;
    } else if (jobList.length > 0) {
      return (
        <table className="job-list-table">
          <thead>
            <th width="20%">Created</th>
            <th>User</th>
            <th>File</th>
            <th>State</th>
            <th width="40%">Progress</th>
          </thead>
          <tbody>
            {jobList.map(job =>
              <JobListItem key={job.id} job={job} selected={job.id === selected} />)}
          </tbody>
        </table>
      );
    } else if (loading) {
      return <div className="loading">Loading&hellip;</div>;
    } else {
      return <div className="empty-list">No Current Jobs</div>;
    }
  }

  public render() {
    return (
      <section className="items" onClick={this.onClick}>{this.renderListContent()}</section>
    );
  }

  private onClick() {
    this.props.dispatch(selectJob(null));
  }
}

export default connect<{}, MappedProps, any>(
  (state, ownProps) => ({ ...ownProps, jobs: state.jobs }),
)(JobList);
