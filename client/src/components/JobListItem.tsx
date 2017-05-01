import * as classnames from 'classnames';
import { Job, JobState } from 'common/types';
import * as dateformat from 'dateformat';
import * as React from 'react';
import { ProgressBar } from 'react-bootstrap';
import { connect } from 'react-redux';
// import './JobListItem.scss';

// Props passed in from parent component
interface DispatchProps {
  jobId: number;
  selected: boolean;
}

// Props after being transformed by connect().
interface MappedProps {
  jobId: number;
  job: Job;
  selected: boolean;
}

/** Displays the current list of jobs. */
class JobListItem extends React.Component<MappedProps, undefined> {
  public render() {
    const { job, selected } = this.props;
    return (
      <tr
          className={classnames('job-list-entry', {
            running: job.state === JobState.RUNNING,
            waiting: job.state === JobState.WAITING,
            finished: job.state === JobState.FINISHED,
            failed: job.state === JobState.FAILED,
            selected,
          })}
      >
        <td className="created">{dateformat(job.createdAt, 'brief')}</td>
        <td className="user">{job.username}</td>
        <td className="file">{job.mainFileName}</td>
        <td className="job-progress">
          <ProgressBar>
            <ProgressBar striped={true} active={true} bsStyle="success" now={50} />
            <ProgressBar bsStyle="danger" now={10} />
          </ProgressBar>
        </td>
      </tr>
    );
  }
}

export default connect<DispatchProps, MappedProps, any>(
  (state, ownProps) => ({ ...ownProps, job: state.jobs.byId.get(ownProps.jobId) }),
)(JobListItem);
