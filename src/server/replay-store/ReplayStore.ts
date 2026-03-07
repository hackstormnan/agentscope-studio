import type { ReplayResult } from '../../core/replay-model';

export interface ListReplaysParams {
  sourceTraceId?: string;
  targetStepId?:  string;
  limit?:         number;
}

export interface ReplayStore {
  saveReplay(result: ReplayResult): Promise<void>;
  getReplay(replayId: string): Promise<ReplayResult | null>;
  listReplays(params?: ListReplaysParams): Promise<ReplayResult[]>;
}
