export interface LogEntry {
  date: Date;
  job: string;
  level: string;
  message: string;
  data?: any;
}
