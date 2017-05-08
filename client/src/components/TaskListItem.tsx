import * as classnames from 'classnames';
import { RunState, Task } from 'common/types/api';
import * as dateformat from 'dateformat';
import * as React from 'react';
import { ProgressBar } from 'react-bootstrap';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { selectTask } from '../store/actions';
// import './TaskListItem.scss';

// Props passed in from parent component
interface DispatchProps {
  task: Task;
  selected: boolean;
}

// Props after being transformed by connect().
interface MappedProps {
  task: Task;
  selected: boolean;
  selectTask: (taskId: string) => void;
}

/** Displays the current list of tasks. */
class TaskListItem extends React.Component<MappedProps, undefined> {
  constructor() {
    super();
    this.onClick = this.onClick.bind(this);
  }

  public renderState(task: Task) {
    switch (task.state) {
      case RunState.WAITING:
        return <div className="status waiting">WAITING</div>;
      case RunState.READY:
        return <div className="status waiting">READY</div>;
      case RunState.RUNNING:
        return <div className="status running">RUNNING</div>;
      case RunState.COMPLETED:
        return <div className="status completed">COMPLETED</div>;
      case RunState.CANCELLING:
        return <div className="status cancelling">CANCELLING</div>;
      case RunState.CANCELLED:
        return <div className="status canceled">CANCELLED</div>;
      case RunState.FAILED:
        return <div className="status failed">FAILED</div>;
    }
  }

  public render() {
    const { task, selected } = this.props;
    return (
      <section
          className={classnames('task-row', {
            running: task.state === RunState.RUNNING,
            waiting: task.state === RunState.WAITING,
            finished: task.state === RunState.COMPLETED,
            cancelling: task.state === RunState.CANCELLING,
            cancelled: task.state === RunState.CANCELLED,
            failed: task.state === RunState.FAILED,
            selected,
          })}
          onClick={this.onClick}
      >
        <div className="id">{task.id}</div>
        {this.renderState(task)}
      </section>
    );
  }

  private onClick(e: any) {
    e.preventDefault();
    e.stopPropagation();
    this.props.selectTask(this.props.task.id);
  }
}

export default connect<DispatchProps, MappedProps, any>(
  undefined,
  // (state) => ({ ...ownProps, task: state.tasks.byId.get(ownProps.taskId) }),
  (dispatch, ownProps) => bindActionCreators({ selectTask }, dispatch),
  undefined,
  { pure: true },
)(TaskListItem);
