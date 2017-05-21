import { Job, ParamType, RunState } from 'api';
import * as dateformat from 'dateformat';
import * as React from 'react';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import { JobQueryResult } from '../store/types/JobQueryResult';
import { RecipeQueryResult } from '../store/types/RecipeQueryResult';
import './JobDetails.scss';

interface JobsDetailsProps {
  jobs: JobQueryResult;
  recipes: RecipeQueryResult;
  dispatch: Dispatch<{}>;
}

/** Displays details of the selected job. */
class JobDetails extends React.Component<JobsDetailsProps, undefined> {
  public render() {
    const { jobs } = this.props;
    const job = jobs.byId.get(jobs.selected);
    if (!job) {
      return <div />;
    }
    const stateName = RunState[job.state];
    return (
      <table className="job-details-table">
        <tbody>
          <tr>
            <th>Job ID</th>
            <td>{job.id}</td>
          </tr>
          <tr>
            <th>Description</th>
            <td>{job.description}</td>
          </tr>
          <tr>
            <th>State</th>
            <td><div className={stateName.toLowerCase()}>{stateName}</div></td>
          </tr>
          <tr>
            <th>Created</th>
            <td>{dateformat(job.createdAt, 'brief')}</td>
          </tr>
          <tr>
            <th>Started</th>
            <td>{job.startedAt ? dateformat(job.startedAt, 'brief') : 'Not started'}</td>
          </tr>
          <tr>
            <th>User</th>
            <td>{job.username}</td>
          </tr>
          <tr>
            <th>Project</th>
            <td>{job.project}</td>
          </tr>
          <tr>
            <th>Asset</th>
            <td>{job.asset}</td>
          </tr>
          <tr>
            <th>Input File</th>
            <td>{job.mainFileName}</td>
          </tr>
          <tr>
            <th>Recipe</th>
            <td>{job.recipe}</td>
          </tr>
          {this.renderJobParams(job)}
          <tr>
            <th>Tasks Completed</th>
            <td>{job.tasksCompleted} / {job.tasksTotal} (
                work {job.workCompleted} / {job.workTotal})</td>
          </tr>
          <tr>
            <th>Tasks Failed</th>
            <td>{job.tasksFailed} / {job.tasksTotal} (
                work {job.workFailed} / {job.workTotal})</td>
          </tr>
        </tbody>
      </table>
    );
  }

  private renderJobParams(job: Job): any {
    const recipe = this.props.recipes.byId.get(job.recipe);
    if (recipe === null) {
      console.error(`recipe: ${job.recipe} not found.`);
      return null;
    }
    const result: any[] = [];
    for (const param of recipe.params) {
      const value: any = job.submissionParams[param.id];
      switch (param.type) {
        case ParamType[ParamType.RANGE]:
          result.push((
            <tr key={param.id}>
              <th>{param.title}</th>
              <td>Start: {value[0]}, End: {value[1]}, Step: {value[2] || 1}</td>
            </tr>
          ));
          break;
      }
    }
    return result;
  }
}

export default connect(
  state => ({ jobs: state.jobs, recipes: state.recipes }),
)(JobDetails);
