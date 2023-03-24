import { ProveRequest, StampStatus } from "@pcd/passport-interface";
import Libhoney from "libhoney";
import { Pool } from "pg";
import Rollbar from "rollbar";

export interface ApplicationContext {
  dbPool: Pool;
  honeyClient: Libhoney | null;
  rollbar: Rollbar | null;
  queue: Array<ProveRequest>;
  stampStatus: Map<string, StampStatus>;
}
