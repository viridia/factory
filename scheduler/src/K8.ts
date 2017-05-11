import Axios, { AxiosInstance, AxiosResponse } from 'axios';
import * as http from 'http';
import { TaskRecord } from '../../common/types/queue';
import { logger } from './logger';

const JOBS_PATH = '/apis/batch/v1/namespaces/default/jobs';
const WATCH_PATH = '/apis/batch/v1/watch/namespaces/default/jobs';

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
        labels: {
          'factory.job': task.jobId,
          'factory.task': task.taskId,
        },
      },
      spec: {
        template: {
          metadata: {
            name,
            labels: {
              group: 'factory',
              component: 'worker',
            },
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

  public getPodStatus(jobId: string): Promise<any> {
    return this.axios.get(`/api/v1/namespaces/default/pods`, {
      params: {
        labelSelector: `job-name=${jobId}`,
      },
    }).then(resp => {
      if (resp.data.items && resp.data.items.length === 1) {
        return resp.data.items[0];
      }
      return null;
      // return Promise.reject(Error('pod not found'));
    });
  }

  public watchJobs(callback: (message: object) => void, endCallback: () => void) {
    const req = http.request({
      host: process.env.K8_HOST,
      port: process.env.K8_PORT,
      path: `${JOBS_PATH}?watch=true`,
      headers: {
        Connection: 'keep-alive',
      },
    }, res => {
      let buffer = Buffer.from([]);
      res.on('data', (data: any) => {
        buffer = Buffer.concat([buffer, data]);
        while (true) {
          const cr = buffer.indexOf('\n');
          if (cr < 0) {
            break;
          }
          const message = JSON.parse(buffer.slice(0, cr).toString());
          callback(message);
          buffer = buffer.slice(cr + 1);
        }
      });
      res.on('end', (data: any) => {
        logger.debug('Watch stream ended.');
        endCallback();
      });
    });
    req.end();
    return req;
  }
}
