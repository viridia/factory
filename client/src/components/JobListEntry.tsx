import * as classnames from 'classnames';
import { Job, JobState } from 'common/types/Job';
import * as React from 'react';
import { connect } from 'react-redux';
// import './JobListEntry.scss';

// Props passed in from parent component
interface DispatchProps {
  jobId: number;
  selected: boolean;
}

// Props after being transformed by connect().
interface StateProps {
  jobId: number;
  job: Job;
  selected: boolean;
}

/** Displays the current list of jobs. */
class JobListEntry extends React.Component<StateProps, undefined> {
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
        <td className="id">{job.id}</td>
        <td className="user">{job.username}</td>
        <td className="file">{job.mainFileName}</td>
      </tr>
    );
  }
}

export default connect<DispatchProps, StateProps, any>(
  (state, ownProps) => ({ ...ownProps, job: state.jobs.byId.get(ownProps.jobId) }),
)(JobListEntry);
