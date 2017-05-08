import * as React from 'react';
import { Button, FormControl } from 'react-bootstrap';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import { createJob } from '../store/createJobStatusReducer';
import { CreateJobStatus } from '../store/types/CreateJobStatus';
import './JobEntryForm.scss';

// Props passed in from parent component
interface DispatchProps {
  createJobStatus: CreateJobStatus;
}

// Props after being transformed by connect().
interface MappedProps {
  createJobStatus: CreateJobStatus;
  dispatch: Dispatch<{}>;
}

interface State {
  inputFile: string;
  recipe: string;
}

class JobEntryForm extends React.Component<MappedProps, State> {
  constructor() {
    super();
    this.state = {
      inputFile: 'dummy.txt',
      recipe: 'mandlebrot',
    };
    this.onChangeRecipe = this.onChangeRecipe.bind(this);
    this.onChangeInputFile = this.onChangeInputFile.bind(this);
    this.onSubmitJob = this.onSubmitJob.bind(this);
  }

  public render() {
    const { busy, error } = this.props.createJobStatus;
    return (
      <section className="job-entry-form">
        User:
        <FormControl
            className="user"
            type="text"
            value="talin"
            readOnly={true}
        />
        Recipe:
        <FormControl
            className="recipe"
            type="text"
            value={this.state.recipe}
            disabled={busy}
            placeholder="recipe"
            onChange={this.onChangeRecipe}
        />
        File:
        <FormControl
            className="input-file"
            type="text"
            value={this.state.inputFile}
            disabled={busy}
            placeholder="input file"
            onChange={this.onChangeInputFile}
        />
        <Button bsStyle="primary" disabled={busy} onClick={this.onSubmitJob}>Submit</Button>
      </section>
    );
  }

  private onChangeRecipe(e: any) {
    this.setState({ recipe: e.target.value });
  }

  private onChangeInputFile(e: any) {
    this.setState({ inputFile: e.target.value });
  }

  private onSubmitJob(e: any) {
    e.preventDefault();
    const { dispatch } = this.props;
    dispatch(createJob({
      user: 10,
      username: 'talin',
      project: 11,
      asset: 12,
      mainFileName: this.state.inputFile,
      recipe: this.state.recipe,
      description: 'Render Mandlebrot',
      args: { frames: [1, 10, 1] },
    }));
  }
}

export default connect<DispatchProps, MappedProps, any>(
  (state, ownProps) => ({ ...ownProps, createJobStatus: state.createJobStatus }),
)(JobEntryForm);
