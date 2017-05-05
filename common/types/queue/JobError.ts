export class JobError extends Error {
  public cancelJob: boolean;
  public details: any;

  constructor(message: string) {
    super(message);
  }
}
