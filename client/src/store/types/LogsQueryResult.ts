import { LogEntry } from 'api';

/** Data structure representing log entries from a job or task. */
export interface LogsQueryResult {
  entries: LogEntry[];
  workerEntries?: string[];
  error?: string;
  loading: boolean;
}
