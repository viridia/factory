import { Task } from 'api';
import * as Immutable from 'immutable';
import * as React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { selectTask, taskListClear } from '../store/actions';
import { updateJobSubscriptions } from '../store/subscriptionsReducer';
import { fetchTasks } from '../store/tasksReducer';
import { JobQueryResult } from '../store/types/JobQueryResult';
import { TaskQueryResult } from '../store/types/TaskQueryResult';
import './TaskList.scss';
import TaskListItem from './TaskListItem';

interface MappedProps {
  jobs: JobQueryResult;
  tasks: TaskQueryResult;
  dispatch: Dispatch<{}>;
  selectTask: (taskId: string) => void;
  taskListClear: () => void;
}

function compareTasks(a: Task, b: Task) {
  if (a.id < b.id) {
    return -1;
  } else if (a.id > b.id) {
    return 1;
  } else {
    return 0;
  }
}

/** Displays the current list of tasks. */
class TaskList extends React.Component<MappedProps, undefined> {
  constructor(props: MappedProps) {
    super(props);
    this.onClick = this.onClick.bind(this);
  }

  public componentWillReceiveProps(nextProps: MappedProps) {
    const { jobs, tasks, dispatch } = nextProps;
    if (jobs.selected !== this.props.jobs.selected) {
      this.props.dispatch(updateJobSubscriptions(jobs.selected));
      if (jobs.selected !== null) {
        dispatch(fetchTasks(jobs.selected));
      } else {
        this.props.taskListClear();
      }
    }
  }

  public shouldComponentUpdate(nextProps: MappedProps): boolean {
    const { tasks, jobs } = this.props;
    // console.log('should update:',
    //     nextProps.jobs !== this.props.jobs,
    //     nextProps.tasks !== this.props.tasks);
    return !(
      Immutable.is(nextProps.tasks.list, tasks.list) &&
      Immutable.is(nextProps.tasks.byId, tasks.byId) &&
      nextProps.tasks.error === tasks.error &&
      nextProps.tasks.loading === tasks.loading &&
      nextProps.tasks.selected === tasks.selected &&
      nextProps.jobs.selected === jobs.selected);
  }

  public renderListContent() {
    const { list, byId, error, loading, selected } = this.props.tasks;
    if (error) {
      return <div className="error">{error}</div>;
    } else if (list.length > 0) {
      const sortedTasks = list.map(id => byId.get(id)).sort(compareTasks);
      return (
        <section className="task-list-table">
          <header className="task-list-header">
            <div className="id">ID</div>
            <div className="status">Status</div>
          </header>
          <section className="task-list-tbody">
            {sortedTasks.map(task => <TaskListItem task={task} selected={task.id === selected} />)}
          </section>
        </section>
      );
    } else if (loading) {
      return <div className="loading">Loading...</div>;
    } else {
      return <div className="empty-list">No Current Tasks</div>;
    }
  }

  public render() {
    return (
      <section className="items" onClick={this.onClick}>{this.renderListContent()}</section>
    );
  }

  private onClick() {
    this.props.selectTask(null);
  }
}

function mapDispatchToProps(dispatch: Dispatch<any>) {
  return {
    ...bindActionCreators({ selectTask, taskListClear }, dispatch),
    dispatch,
  };
}

export default connect<{}, MappedProps, any>(
  (state) => ({ jobs: state.jobs, tasks: state.tasks }),
  mapDispatchToProps,
)(TaskList);
