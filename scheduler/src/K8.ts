import Axios, { AxiosInstance, AxiosResponse } from 'axios';
import { TaskRecord } from '../../common/types/queue';

const JOBS_PATH = '/apis/batch/v1/namespaces/default/jobs';

/** Class to talk to Kubernetes. */
export default class K8 {
  private axios: AxiosInstance;

  constructor() {
    this.axios = Axios.create({
      baseURL: `http://${process.env.K8_HOST}:${process.env.K8_PORT}`,
    });
  }

  public getJobs(): Promise<any> {
    return this.axios.get(JOBS_PATH).then(resp => {
      return resp.data.items;
    });
  }

  // Response
  // { kind: 'Job',
  //   apiVersion: 'batch/v1',
  //   metadata:
  //    { name: 'mandlebrot-sample',
  //      namespace: 'default',
  //      selfLink: '/apis/batch/v1/namespaces/default/jobs/mandlebrot-sample',
  //      uid: 'b344ae5a-342f-11e7-bddf-080027186927',
  //      resourceVersion: '121929',
  //      creationTimestamp: '2017-05-08T20:48:33Z',
  //      labels:
  //       { 'controller-uid': 'b344ae5a-342f-11e7-bddf-080027186927',
  //         'job-name': 'mandlebrot-sample' } },
  //   spec:
  //    { parallelism: 1,
  //      completions: 1,
  //      selector: { matchLabels: [Object] },
  //      template: { metadata: [Object], spec: [Object] } },
  //   status: {} }
  // []

  public createJob(task: TaskRecord) {
    const name = `${task.jobId}:${task.taskId}`;
    return this.axios.post(JOBS_PATH, {
      kind: 'Job',
      metadata: { name },
      spec: {
        template: {
          metadata: {
            name,
            labels: { group: 'factory', component: 'worker' },
          },
          spec: {
            containers: [{
              name: 'renderer',
              image: task.image,
              // command: '',
              args: task.args,
              imagePullPolicy: 'Never',
              volumeMounts: [{ name: 'sandbox', mountPath: '/usr/nimble/sandbox' }],
            }],
            volumes: [{ name: 'sandbox', emptyDir: {} }],
            restartPolicy: 'Never',
          },
        },
      },
    }).then(resp => {
      // console.log(resp);
      return resp;
    });
  }

  public deleteJob(task: TaskRecord) {
    return this.axios.delete(task.k8Link);
  }
}
