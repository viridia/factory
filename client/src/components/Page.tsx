import { Task } from 'common/types/Task';
import * as Immutable from 'immutable';
import * as React from 'react';
import JobList from './JobList';
import './Page.scss';
import TaskList from './TaskList';

export default class Page extends React.Component<undefined, undefined> {
  public render() {
    return (
      <section className="page">
        <header className="page-header">Render Factory</header>
        <section className="job-view">
          <section className="job-list">
            <header>Jobs</header>
            <JobList />
          </section>
          <section className="task-panel">
            <section className="job-details">
              <header>Job Details</header>
            </section>
            <section className="task-list">
              <header>Tasks</header>
              <TaskList tasks={Immutable.List<Task>()} />
            </section>
            <section className="task-details">
              <header>Task Details</header>
            </section>
          </section>
        </section>
      </section>
    );
  }
}
