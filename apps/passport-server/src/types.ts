import {
  ProveRequest,
  ProveResponse,
  StampStatus,
} from "@pcd/passport-interface";
import Libhoney from "libhoney";
import { Pool } from "pg";
import Rollbar from "rollbar";

export interface ApplicationContext {
  dbPool: Pool;
  honeyClient: Libhoney | null;
  rollbar: Rollbar | null;
}

export interface ServerProvingContext {
  queue: Array<ProveRequest>;
  stampStatus: Map<string, StampStatus>;
  stampResult: Map<string, ProveResponse>;
}
