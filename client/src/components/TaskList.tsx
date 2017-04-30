import { Task } from 'common/types/Task';
import * as Immutable from 'immutable';
import * as React from 'react';
import './TaskList.scss';

interface TasksListProps {
  tasks: Immutable.List<Task>;
}

/** Displays the current list of tasks. */
export default class TaskList extends React.Component<TasksListProps, undefined> {
  public render() {
    const { tasks } = this.props;
    return (
      <section className="items">
        {tasks.size === 0 ?
          <div className="empty-list">No Current Tasks</div> :
          <div className="item">Some item</div> }
      </section>
    );
  }
}
