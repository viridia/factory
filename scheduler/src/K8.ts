import Axios, { AxiosInstance, AxiosResponse } from 'axios';

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

  public createJob(name: string, image: string) {
    return this.axios.post(JOBS_PATH, {
      kind: 'Job',
      metadata: { name },
      spec: {
        template: {
          metadata: { name },
          spec: {
            containers: [{
              name: 'renderer',
              image,
              command: '',
              imagePullPolicy: 'Never',
            }],
            restartPolicy: 'Never',
          },
        },
      },
    }).then(resp => {
      console.log(resp);
      return resp;
    });
  }
}
// axios.get(`http://${process.env.K8_HOST}:${process.env.K8_PORT}/${process.env.K8_PATH}`)
// .then(resp => {
//   console.log(resp);
// });
