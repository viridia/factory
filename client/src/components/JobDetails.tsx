import { Job, JobState } from 'common/types/api';
import * as dateformat from 'dateformat';
import * as React from 'react';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import { JobQueryResult } from '../store/types/JobQueryResult';
import './JobDetails.scss';

interface JobsDetailsProps {
  jobs: JobQueryResult;
  dispatch: Dispatch<{}>;
}

/** Displays details of the selected job. */
class JobDetails extends React.Component<JobsDetailsProps, undefined> {
  public render() {
    const { jobs } = this.props;
    const job = jobs.byId.get(jobs.selected);
    if (!job) {
      return <div />;
    }
    return (
      <table className="job-details-table">
        <tbody>
          <tr>
            <th>Job ID</th>
            <td>{job.id}</td>
          </tr>
          <tr>
            <th>Description</th>
            <td>{job.description}</td>
          </tr>
          <tr>
            <th>State</th>
            <td>{this.renderState(job)}</td>
          </tr>
          <tr>
            <th>Created</th>
            <td>{dateformat(job.createdAt, 'brief')}</td>
          </tr>
          <tr>
            <th>Started</th>
            <td>{job.startedAt ? dateformat(job.startedAt, 'brief') : 'Not started'}</td>
          </tr>
          <tr>
            <th>User</th>
            <td>{job.username}</td>
          </tr>
          <tr>
            <th>Project</th>
            <td>{job.project}</td>
          </tr>
          <tr>
            <th>Asset</th>
            <td>{job.asset}</td>
          </tr>
          <tr>
            <th>Input File</th>
            <td>{job.mainFileName}</td>
          </tr>
          <tr>
            <th>Recipe</th>
            <td>{job.recipe}</td>
          </tr>
        </tbody>
      </table>
    );
  }

  private renderState(job: Job) {
    switch (job.state) {
      case JobState.WAITING:
        return <div className="waiting">WAITING</div>;
      case JobState.RUNNING:
        return <div className="running">RUNNING</div>;
      case JobState.COMPLETED:
        return <div className="completed">COMPLETED</div>;
      case JobState.CANCELLED:
        return <div className="canceled">CANCELLED</div>;
      case JobState.FAILED:
        return <div className="failed">FAILED</div>;
    }
  }
}

export default connect(
  state => ({ jobs: state.jobs }),
)(JobDetails);