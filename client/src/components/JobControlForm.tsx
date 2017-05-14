import { Job, LogEntry, RunState } from 'api';
import * as React from 'react';
import { Button } from 'react-bootstrap';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import { fetchJobLogs } from '../store/jobLogsReducer';
import { cancelJob, deleteJob } from '../store/jobsReducer';
import { JobQueryResult } from '../store/types/JobQueryResult';
import { LogsQueryResult } from '../store/types/LogsQueryResult';
import './JobControlForm.scss';
import { LogsViewer } from './LogsViewer';

interface JobControlFormProps {
  jobs: JobQueryResult;
  jobLogs: LogsQueryResult;
  dispatch: Dispatch<{}>;
}

interface State {
  showLogs: boolean;
}

/** Displays details of the selected job. */
class JobControlForm extends React.Component<JobControlFormProps, State> {
  constructor() {
    super();
    this.onClickCancel = this.onClickCancel.bind(this);
    this.onClickDelete = this.onClickDelete.bind(this);
    this.onClickViewLogs = this.onClickViewLogs.bind(this);
    this.onCloseLogsViewer = this.onCloseLogsViewer.bind(this);
    this.state = {
      showLogs: false,
    };
  }

  public render() {
    const { jobs } = this.props;
    const job = jobs.byId.get(jobs.selected);
    if (!job) {
      return null;
    }
    const showCancel = job.state === RunState.WAITING
        || job.state === RunState.READY
        || job.state === RunState.RUNNING
        || job.state === RunState.CANCELLING
        || job.state === RunState.FAILING;
    const canDelete = job.state === RunState.CANCELLED
        || job.state === RunState.COMPLETED
        || job.state === RunState.FAILED;
    return (
      <section className="job-control-form">
        {showCancel && <Button
            bsStyle="danger"
            disabled={job.state === RunState.CANCELLING || job.state === RunState.FAILING}
            onClick={this.onClickCancel}
        >
          Cancel
        </Button>}
        {canDelete && <Button bsStyle="danger" onClick={this.onClickDelete}>Remove</Button>}
        <span className="flex" />
        <Button bsStyle="default" onClick={this.onClickViewLogs}>View Logs</Button>
        <LogsViewer
            open={this.state.showLogs}
            onHide={this.onCloseLogsViewer}
            logs={this.props.jobLogs}
        />
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

  private onClickViewLogs(e: any) {
    const { jobs } = this.props;
    e.preventDefault();
    this.setState({ showLogs: true });
    this.props.dispatch(fetchJobLogs(jobs.selected));
    // this.props.dispatch(deleteJob(jobs.selected));
  }

  private onCloseLogsViewer() {
    this.setState({ showLogs: false });
  }
}

export default connect(
  state => ({
    jobs: state.jobs,
    jobLogs: state.jobLogs,
  }),
)(JobControlForm);
