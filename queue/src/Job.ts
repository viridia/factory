import { RunState } from '../../common/api';

export interface Job {
  id: string;
  state: RunState;
  when: Date;
  startedAt?: Date;
  endedAt?: Date;
}
