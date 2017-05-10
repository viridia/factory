import { Job, RunState } from 'common/types/api';
import * as React from 'react';
import { Button } from 'react-bootstrap';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import { cancelJob, deleteJob } from '../store/jobsReducer';
import { JobQueryResult } from '../store/types/JobQueryResult';
import './JobControlForm.scss';

interface JobControlFormProps {
  jobs: JobQueryResult;
  dispatch: Dispatch<{}>;
}

/** Displays details of the selected job. */
class JobControlForm extends React.Component<JobControlFormProps, undefined> {
  constructor() {
    super();
    this.onClickCancel = this.onClickCancel.bind(this);
    this.onClickDelete = this.onClickDelete.bind(this);
  }

  public render() {
    const { jobs } = this.props;
    const job = jobs.byId.get(jobs.selected);
    if (!job) {
      return null;
    }
    const canCancel = job.state === RunState.WAITING
        || job.state === RunState.READY
        || job.state === RunState.RUNNING;
    const canDelete = job.state === RunState.CANCELLED
        || job.state === RunState.COMPLETED
        || job.state === RunState.FAILED;
    return (
      <section className="job-control-form">
        {canCancel && <Button bsStyle="danger" onClick={this.onClickCancel}>Cancel</Button>}
        {canDelete && <Button bsStyle="danger" onClick={this.onClickDelete}>Remove</Button>}
        <span className="flex" />
        <Button bsStyle="default">View Logs</Button>
      </section>
    );
  }

  private onClickCancel(e: any) {
    e.preventDefault();
    const { jobs } = this.props;
    this.props.dispatch(cancelJob(jobs.selected));
  }

  private onClickDelete(e: any) {
    e.preventDefault();
    const { jobs } = this.props;
    this.props.dispatch(deleteJob(jobs.selected));
  }
}

export default connect(
  state => ({ jobs: state.jobs }),
)(JobControlForm);
