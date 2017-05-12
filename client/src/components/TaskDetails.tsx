import { RunState, Task } from 'common/types/api';
import * as dateformat from 'dateformat';
import * as React from 'react';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import { TaskQueryResult } from '../store/types/TaskQueryResult';
import './TaskDetails.scss';

interface TaskDetailsProps {
  tasks: TaskQueryResult;
  dispatch: Dispatch<{}>;
}

/** Displays details of the selected job. */
class TaskDetails extends React.Component<TaskDetailsProps, undefined> {
  public render() {
    const { tasks } = this.props;
    const task = tasks.byId.get(tasks.selected);
    if (!task) {
      return <div />;
    }
    const stateName = RunState[task.state];
    return (
      <table className="task-details-table">
        <tbody>
          <tr>
            <th>Task ID</th>
            <td>{task.id}</td>
          </tr>
          <tr>
            <th>State</th>
            <td><div className={stateName.toLowerCase()}>{stateName}</div></td>
          </tr>
          {task.depends && <tr>
            <th>Depends</th>
            <td>{task.depends.map(arg => <div>{arg} </div>)}</td>
          </tr>}
          <tr>
            <th>Started</th>
            <td>{task.startedAt ? dateformat(task.startedAt, 'brief') : 'Not started'}</td>
          </tr>
          <tr>
            <th>Ended</th>
            <td>{task.endedAt ? dateformat(task.endedAt, 'brief') : 'Not ended'}</td>
          </tr>
          {task.image && <tr>
            <th>Image</th>
            <td>{task.image}</td>
          </tr>}
          {task.workdir && <tr>
            <th>Working Dir</th>
            <td>{task.workdir}</td>
          </tr>}
          <tr>
            <th>Args</th>
            <td>{task.args.map(arg => <span>{arg} </span>)}</td>
          </tr>
          {task.outputs && <tr>
            <th>Outputs</th>
            <td>{task.outputs.map(name => <div>{name}</div>)}</td>
          </tr>}
        </tbody>
      </table>
    );
  }
}

export default connect(
  state => ({ tasks: state.tasks }),
)(TaskDetails);
