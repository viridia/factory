import { Task } from 'api';
import * as Immutable from 'immutable';
import * as React from 'react';
import JobControlForm from './JobControlForm';
import JobDetails from './JobDetails';
import JobEntryForm from './JobEntryForm';
import JobList from './JobList';
import './Page.scss';
import TaskControlForm from './TaskControlForm';
import TaskDetails from './TaskDetails';
import TaskList from './TaskList';

export default class Page extends React.Component<undefined, undefined> {
  public render() {
    return (
      <section className="page">
        <header className="page-header">Render Factory</header>
        <section className="status-page">
          <section className="job-panel">
            <section className="job-list border-panel">
              <header>Jobs</header>
              <JobList />
            </section>
            <section className="task-list border-panel">
              <header>Tasks</header>
              <TaskList />
            </section>
          </section>
          <section className="task-panel">
            <section className="job-details border-panel">
              <header>Job Details</header>
              <JobDetails />
              <JobControlForm />
            </section>
            <section className="task-details border-panel">
              <header>Task Details</header>
              <TaskDetails />
              <TaskControlForm />
            </section>
          </section>
        </section>
        <footer className="job-form border-panel">
          <JobEntryForm />
        </footer>
      </section>
    );
  }
}
