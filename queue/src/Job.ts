import { RunState } from '../../common/types/api';

export interface Job {
  id: string;
  state: RunState;
  when: Date;
  startedAt?: Date;
  endedAt?: Date;
}
