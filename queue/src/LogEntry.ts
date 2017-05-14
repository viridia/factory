export interface LogEntry {
  date: Date;
  level: string;
  message: string;
  data?: any;
}
