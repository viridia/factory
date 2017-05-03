import { Job, JobState } from 'common/types/api';
import * as React from 'react';
import { Button } from 'react-bootstrap';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import { cancelJob } from '../store/jobsReducer';
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
  }

  public render() {
    const { jobs } = this.props;
    const job = jobs.byId.get(jobs.selected);
    if (!job) {
      return null;
    }
    const disabled = job.state !== JobState.WAITING && job.state !== JobState.RUNNING;
    return (
      <section className="job-control-form">
        <Button bsStyle="danger" onClick={this.onClickCancel} disabled={!job}>Cancel</Button>
      </section>
    );
  }

  private onClickCancel(e: any) {
    e.preventDefault();
    const { jobs } = this.props;
    this.props.dispatch(cancelJob(jobs.selected));
  }
}

export default connect(
  state => ({ jobs: state.jobs }),
)(JobControlForm);
