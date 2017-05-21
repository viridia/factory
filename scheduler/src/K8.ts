import Axios, { AxiosInstance, AxiosResponse } from 'axios';
import * as fs from 'fs';
import * as http from 'http';
import * as https from 'https';
import Service from '../../common/k8/Service';
import { TaskRecord } from '../../common/types/queue';
import { logger } from './logger';

const JOBS_PATH = '/apis/batch/v1/namespaces/default/jobs';
const WATCH_PATH = '/apis/batch/v1/watch/namespaces/default/jobs';
const PODS_PATH = '/api/v1/namespaces/default/pods';

interface RequestOptions {
  headers?: { [headerName: string]: string };
}

/** Class to talk to Kubernetes. */
export default class K8 extends Service {
  public getJobs(): Promise<any> {
    return this.get(JOBS_PATH).then(resp => {
      return resp.data.items;
    });
  }

  public create(task: TaskRecord) {
    const name = `factory-${task.taskId}-${task.jobId}`;
    return this.post(JOBS_PATH, {
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
              'factory.job': task.jobId,
              'factory.task': task.taskId,
              'group': 'factory',
              'component': 'worker',
            },
          },
          spec: {
            restartPolicy: 'Never',
            containers: [{
              name: 'renderer',
              image: task.image,
              workingDir: task.workdir,
              // command: '',
              args: task.args,
              imagePullPolicy: 'IfNotPresent',
              restartPolicy: 'Never',
              volumeMounts: [{
                name: 'sandbox',
                mountPath: '/usr/nimble/sandbox',
              }],
            }],
            volumes: [{
              name: 'sandbox',
              // hostPath: { path: '/usr/nimble/sandbox' },
              hostPath: { path: '/mount-9p/sandbox' },
            }],
          },
        },
      },
    }).then(resp => {
      // console.log(resp);
      return resp;
      // TODO: normalize errors.
    });
  }

  public deleteJobs(jobId: string) {
    // TODO: normalize errors.
    return this.delete('/apis/batch/v1/namespaces/default/jobs', {
      params: {
        labelSelector: { 'factory.job': jobId },
      },
    });
  }

  public deletePods(jobId: string) {
    // TODO: normalize errors.
    return this.delete('/apis/batch/v1/namespaces/default/jobs', {
      params: {
        labelSelector: { 'factory.job': jobId },
      },
    });
  }

  public deleteJob(task: TaskRecord) {
    return this.delete(task.k8Link);
    // TODO: normalize errors.
  }

  public getJobStatus(task: TaskRecord) {
    return this.get(task.k8Link).then(resp => {
      return resp.data;
      // TODO: normalize errors.
    });
  }

  public getPodStatus(jobId: string): Promise<any> {
    return this.get(`/api/v1/namespaces/default/pods`, {
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

  // public request(
  //     path: string,
  //     options?: RequestOptions,
  //     callback?: (res: http.IncomingMessage) => void) {
  //   const headers: { [headerName: string]: string } = {};
  //   if (options.headers) {
  //     Object.assign(headers, options.headers);
  //   }
  //   if (this.isHttps) {
  //     if (!headers.Authorization) {
  //       headers.Authorization = `Bearer ${this.token}`;
  //     }
  //     return https.request({
  //       host: process.env.KUBERNETES_SERVICE_HOST,
  //       port: process.env.KUBERNETES_SERVICE_PORT,
  //       cert: this.cert,
  //       path,
  //       headers,
  //     });
  //   } else {
  //     return http.request({
  //       host: process.env.KUBERNETES_SERVICE_HOST,
  //       port: process.env.KUBERNETES_SERVICE_PORT,
  //       path,
  //       headers: options.headers,
  //     });
  //   }
  // }

  public watchJobs(callback: (messages: object[]) => void, endCallback: () => void) {
    return this.watch(`${JOBS_PATH}?watch=true`, callback, endCallback);
  }
}
