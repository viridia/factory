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
  jobId: number;
  selected: boolean;
}

// Props after being transformed by connect().
interface MappedProps {
  jobId: number;
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
    console.log(job);
    const finishedProgress = 100 * job.workCompleted / Math.min(job.workTotal, 1);
    const failedProgress = 100 * job.workFailed / Math.min(job.workTotal, 1);
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
  (state, ownProps) => ({ ...ownProps, job: state.jobs.byId.get(ownProps.jobId) }),
  (dispatch, ownProps) => bindActionCreators({ selectJob }, dispatch),
  undefined,
  { pure: true },
)(JobListItem);
