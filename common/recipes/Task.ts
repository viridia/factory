export default class Task {
  public taskId: string;
  public title: string;
  public stepIndex: number;
  public depends: string[];
  public dependents: string[];
  public image?: string;
  public args: string[];
  public env: { [name: string]: string };
  public inputs: string[];
  public outputs: string[];
  public weight: number;

  constructor(id: string, title: string) {
    this.taskId = id;
    this.title = title;
    this.stepIndex = 0;
    this.depends = [];
    this.dependents = [];
    this.image = null;
    this.args = [];
    this.env = {};
    this.inputs = [];
    this.outputs = [];
    this.weight = 1;
  }
}
