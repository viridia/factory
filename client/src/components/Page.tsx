import * as React from 'react';
import './Page.scss';

export default class Page extends React.Component<undefined, undefined> {
  public render() {
    return (
      <section className="page">
        <header className="page-header">Render Factory</header>
        <section className="job-view">
          <section className="job-list">
            <header>Jobs</header>
            <section className="items" />
          </section>
          <section className="task-panel">
            <section className="task-list">
              <header>Tasks</header>
              <section className="items" />
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
