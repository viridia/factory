import { RunState, Task } from 'api';
import * as classnames from 'classnames';
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

  public render() {
    const { task, selected } = this.props;
    const st = (RunState[task.state] || '').toLowerCase();
    return (
      <section
          className={classnames('task-row', st, { selected })}
          onClick={this.onClick}
      >
        <div className="id">{task.id}</div>
        <td className="state"><div className="pill">{RunState[task.state]}</div></td>
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
