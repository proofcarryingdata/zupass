import { PipelineLoadSummary } from "@pcd/passport-interface";
import { PCDAction } from "@pcd/pcd-collection";
import { PODAtom } from "./PODPipeline";

export interface Plugin {
  start(): Promise<void>;
  stop(): Promise<void>;
  afterLoad(atoms: readonly PODAtom[]): Promise<Partial<PipelineLoadSummary>>;
  afterIssue(actions: readonly PCDAction[]): Promise<void>;
}
