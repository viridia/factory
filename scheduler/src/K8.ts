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

  public createJob(task: TaskRecord) {
    const name = `factory-${task.taskId}-${task.jobId}`;
    return this.axios.post(JOBS_PATH, {
      kind: 'Job',
      metadata: {
        name,
        'factory.job': task.jobId,
        'factory.task': task.taskId,
      },
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
      // TODO: normalize errors.
    });
  }

  public deleteJob(task: TaskRecord) {
    return this.axios.delete(task.k8Link);
    // TODO: normalize errors.
  }

  public getJobStatus(task: TaskRecord) {
    return this.axios.get(task.k8Link).then(resp => {
      return resp.data;
      // TODO: normalize errors.
    });
  }
}
