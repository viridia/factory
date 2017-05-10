import * as classnames from 'classnames';
import { Job, RunState } from 'common/types/api';
import * as dateformat from 'dateformat';
import * as React from 'react';
import { ProgressBar } from 'react-bootstrap';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { selectJob } from '../store/actions';
// import './JobListItem.scss';

// Props passed in from parent component
interface DispatchProps {
  job: Job;
  selected: boolean;
}

// Props after being transformed by connect().
interface MappedProps {
  job: Job;
  selected: boolean;
  selectJob: (jobId: string) => void;
}

/** Displays the current list of jobs. */
class JobListItem extends React.Component<MappedProps, undefined> {
  constructor() {
    super();
    this.onClick = this.onClick.bind(this);
  }

  public render() {
    const { job, selected } = this.props;
    let finishedProgress = 0;
    let failedProgress = 0;
    if (job.workTotal <= 0) {
      if (job.state === RunState.FAILED) {
        failedProgress = 100;
      } else if (job.state === RunState.COMPLETED) {
        finishedProgress = 100;
      }
    } else {
      finishedProgress = 100 * job.workCompleted / Math.min(job.workTotal, 1);
      failedProgress = 100 * job.workFailed / Math.min(job.workTotal, 1);
    }
    return (
      <tr
          className={classnames('job-list-entry', RunState[job.state].toLowerCase(), { selected } )}
          onClick={this.onClick}
      >
        <td className="created">{dateformat(job.createdAt, 'brief')}</td>
        <td className="user">{job.username}</td>
        <td className="file">{job.mainFileName}</td>
        <td className="state"><div className="pill">{RunState[job.state]}</div></td>
        <td className="job-progress">
          <ProgressBar>
            <ProgressBar striped={true} active={true} bsStyle="success" now={finishedProgress} />
            <ProgressBar bsStyle="danger" now={failedProgress} />
          </ProgressBar>
        </td>
      </tr>
    );
  }

  private onClick(e: any) {
    e.preventDefault();
    e.stopPropagation();
    this.props.selectJob(this.props.job.id);
  }
}

export default connect<DispatchProps, MappedProps, any>(
  undefined,
  (dispatch, ownProps) => bindActionCreators({ selectJob }, dispatch),
  undefined,
  { pure: true },
)(JobListItem);
