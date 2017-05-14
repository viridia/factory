import { RunState, Task } from 'common/types/api';
import { LogEntry } from 'common/types/api/LogEntry';
import * as React from 'react';
import { Button } from 'react-bootstrap';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import { fetchTaskLogs } from '../store/taskLogsReducer';
import { LogsQueryResult } from '../store/types/LogsQueryResult';
import { TaskQueryResult } from '../store/types/TaskQueryResult';
import { LogsViewer } from './LogsViewer';
import './TaskControlForm.scss';

interface TaskControlFormProps {
  tasks: TaskQueryResult;
  taskLogs: LogsQueryResult;
  dispatch: Dispatch<{}>;
}

interface State {
  showLogs: boolean;
}

/** Displays details of the selected task. */
class TaskControlForm extends React.Component<TaskControlFormProps, State> {
  constructor() {
    super();
    this.onClickViewLogs = this.onClickViewLogs.bind(this);
    this.onCloseLogsViewer = this.onCloseLogsViewer.bind(this);
    this.state = {
      showLogs: false,
    };
  }

  public render() {
    const { tasks } = this.props;
    const task = tasks.byId.get(tasks.selected);
    if (!task) {
      return null;
    }
    return (
      <section className="task-control-form">
        <Button bsStyle="default" onClick={this.onClickViewLogs}>View Logs</Button>
        <LogsViewer
            open={this.state.showLogs}
            onHide={this.onCloseLogsViewer}
            logs={this.props.taskLogs}
        />
      </section>
    );
  }

  private onClickViewLogs(e: any) {
    const { tasks } = this.props;
    const task = tasks.byId.get(tasks.selected);
    e.preventDefault();
    if (!task) {
      return;
    }
    this.setState({ showLogs: true });
    this.props.dispatch(fetchTaskLogs(task.jobId, tasks.selected));
    // this.props.dispatch(deleteTask(tasks.selected));
  }

  private onCloseLogsViewer() {
    this.setState({ showLogs: false });
  }
}

export default connect(
  state => ({
    tasks: state.tasks,
    taskLogs: state.taskLogs,
  }),
)(TaskControlForm);
