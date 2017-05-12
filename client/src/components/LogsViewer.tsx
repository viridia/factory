import * as React from 'react';
import { Button, Modal } from 'react-bootstrap';
import './LogsViewer.scss';

interface Props {
  open: boolean;
  onHide: () => void;
}

interface State {
  show: boolean;
}

export class LogsViewer extends React.Component<Props, State> {
  constructor() {
    super();
    this.onExited = this.onExited.bind(this);
    this.state = {
      show: false,
    };
  }

  public componentWillReceiveProps(nextProps: Props) {
    if (nextProps.open) {
      this.setState({ show: true });
    }
  }

  public render() {
    return (this.props.open || this.state.show) && (
      <Modal
          className="factory-dialog"
          dialogClassName="logs-viewer"
          show={this.props.open}
          onHide={this.props.onHide}
          onExited={this.onExited}
      >
        <Modal.Header closeButton={true}>
          <Modal.Title>Logs for Task render.1</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <section className="log-entries">
            Logs
          </section>
        </Modal.Body>
        <Modal.Footer>
          <Button bsStyle="default" onClick={this.props.onHide}>Close</Button>
        </Modal.Footer>
      </Modal>
    );
  }

  private onExited() {
    this.setState({ show: false });
  }
}
