import * as React from 'react';
import { Button, Dropdown, FormControl, MenuItem } from 'react-bootstrap';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import { create } from '../store/createJobStatusReducer';
import { fetchRecipes } from '../store/recipesReducer';
import { CreateJobStatus } from '../store/types/CreateJobStatus';
import { RecipeQueryResult } from '../store/types/RecipeQueryResult';
import './JobEntryForm.scss';

// Props passed in from parent component
interface DispatchProps {
  createJobStatus: CreateJobStatus;
}

// Props after being transformed by connect().
interface MappedProps {
  createJobStatus: CreateJobStatus;
  recipes: RecipeQueryResult;
  dispatch: Dispatch<{}>;
}

interface State {
  inputFile: string;
  recipe: string;
  startFrame: string;
  endFrame: string;
}

class JobEntryForm extends React.Component<MappedProps, State> {
  constructor() {
    super();
    this.state = {
      inputFile: 'dummy.txt',
      recipe: 'mandelbrot',
      startFrame: '1',
      endFrame: '10',
    };
    this.onSelectRecipe = this.onSelectRecipe.bind(this);
    this.onChangeInputFile = this.onChangeInputFile.bind(this);
    this.onChangeStartFrame = this.onChangeStartFrame.bind(this);
    this.onChangeEndFrame = this.onChangeEndFrame.bind(this);
    this.onSubmitJob = this.onSubmitJob.bind(this);
  }

  public componentWillMount() {
    const { dispatch, recipes } = this.props;
    if (!recipes.loaded) {
      dispatch(fetchRecipes());
    }
  }

  public render() {
    const { recipes } = this.props;
    const { recipe } = this.state;
    const { busy, error } = this.props.createJobStatus;
    const frameRange = this.frameRange();
    const disabled = (busy
        || isNaN(frameRange[0])
        || isNaN(frameRange[1])
        || frameRange[0] < 0
        || frameRange[1] > 10000000
        || frameRange[0] > frameRange[1]);
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
        <Dropdown id="recipe-selector" dropup={true} onSelect={this.onSelectRecipe}>
          <Dropdown.Toggle>
            {recipe}
          </Dropdown.Toggle>
          <Dropdown.Menu>
            {recipes.list.map(id => <MenuItem eventKey={id}>{id}</MenuItem>)}
          </Dropdown.Menu>
        </Dropdown>
        File:
        <FormControl
            className="input-file"
            type="text"
            value={this.state.inputFile}
            disabled={busy}
            placeholder="input file"
            onChange={this.onChangeInputFile}
        />
        Start:
        <FormControl
            className="start-frame"
            type="number"
            value={this.state.startFrame}
            disabled={busy}
            placeholder="start frame"
            onChange={this.onChangeStartFrame}
        />
        End:
        <FormControl
            className="end-frame"
            type="number"
            value={this.state.endFrame}
            disabled={busy}
            placeholder="end frame"
            onChange={this.onChangeEndFrame}
        />
        <Button bsStyle="primary" disabled={disabled} onClick={this.onSubmitJob}>Submit</Button>
      </section>
    );
  }

  private onSelectRecipe(eventKey: any) {
    this.setState({ recipe: eventKey });
  }

  private onChangeInputFile(e: any) {
    this.setState({ inputFile: e.target.value });
  }

  private onChangeStartFrame(e: any) {
    this.setState({ startFrame: e.target.value });
  }

  private onChangeEndFrame(e: any) {
    this.setState({ endFrame: e.target.value });
  }

  private frameRange() {
    return [
      parseInt(this.state.startFrame, 10),
      parseInt(this.state.endFrame, 10),
      1,
    ];
  }

  private onSubmitJob(e: any) {
    e.preventDefault();
    const { dispatch } = this.props;
    dispatch(create({
      user: 10,
      username: 'talin',
      project: 11,
      asset: 12,
      mainFileName: this.state.inputFile,
      recipe: this.state.recipe,
      description: 'Render Mandlebrot',
      args: { frames: this.frameRange() },
    }));
  }
}

export default connect<DispatchProps, MappedProps, any>(
  (state, ownProps) => ({
    ...ownProps,
    createJobStatus: state.createJobStatus,
    recipes: state.recipes,
  }),
)(JobEntryForm);
