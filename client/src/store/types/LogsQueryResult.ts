import { LogEntry } from 'api';

/** Data structure representing log entries from a job or task. */
export interface LogsQueryResult {
  entries: LogEntry[];
  error?: string;
  loading: boolean;
}
