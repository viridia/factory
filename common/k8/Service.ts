import Axios, { AxiosInstance, AxiosPromise, AxiosRequestConfig, AxiosResponse } from 'axios';
import * as fs from 'fs';

/** Class to talk to Kubernetes Service API. Sort of like Axios but handles K8 certs and
    streaming. */
export default class Service {
  public get: (url: string, config?: AxiosRequestConfig) => AxiosPromise;
  public delete: (url: string, config?: AxiosRequestConfig) => AxiosPromise;
  public head: (url: string, config?: AxiosRequestConfig) => AxiosPromise;
  public post: (url: string, data?: any, config?: AxiosRequestConfig) => AxiosPromise;
  public put: (url: string, data?: any, config?: AxiosRequestConfig) => AxiosPromise;
  public patch: (url: string, data?: any, config?: AxiosRequestConfig) => AxiosPromise;

  protected axios: AxiosInstance;
  protected host: string;
  protected port: number;
  protected isHttps: boolean;
  protected cert?: Buffer;
  protected token?: Buffer;

  constructor() {
    this.host = process.env.KUBERNETES_SERVICE_HOST;
    this.port = process.env.KUBERNETES_SERVICE_PORT;
    this.isHttps = process.env.KUBERNETES_SERVICE_PORT === '443';
    this.axios = Axios.create({
      baseURL:
          `http://${process.env.KUBERNETES_SERVICE_HOST}:${process.env.KUBERNETES_SERVICE_PORT}`,
    });
    if (this.isHttps) {
      this.cert = fs.readFileSync('/var/run/secrets/kubernetes.io/serviceaccount/ca.crt');
      this.token = fs.readFileSync('/var/run/secrets/kubernetes.io/serviceaccount/token');
      this.axios.interceptors.request.use((config) => {
        config.headers.Authorization = `Bearer ${this.token}`;
        (config as any).cert = this.cert;
        return config;
      });
    }
    this.get = this.axios.get.bind(this.axios);
    this.delete = this.axios.delete.bind(this.axios);
    this.head = this.axios.head.bind(this.axios);
    this.post = this.axios.post.bind(this.axios);
    this.put = this.axios.put.bind(this.axios);
    this.patch = this.axios.patch.bind(this.axios);
  }

  public watch(
      path: string,
      callback: (messages: object[]) => void,
      endCallback: () => void) {
    return this.axios.get(path, {
      headers: { Connection: 'keep-alive' },
      responseType: 'stream',
    }).then(resp => {
      // , res => {
      let buffer = Buffer.from([]);
      const res = resp.data;
      res.on('data', (data: any) => {
        const messages = []; // Buffer messages.
        buffer = Buffer.concat([buffer, data]);
        while (true) {
          const cr = buffer.indexOf('\n');
          if (cr < 0) {
            break;
          }
          messages.push(JSON.parse(buffer.slice(0, cr).toString()));
          buffer = buffer.slice(cr + 1);
        }
        callback(messages);
      });
      res.on('end', () => {
        endCallback();
      });
    });
  }
}
