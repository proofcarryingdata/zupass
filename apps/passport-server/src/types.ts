import {
  ProveRequest,
  ProveResponse,
  StampStatus,
} from "@pcd/passport-interface";
import Libhoney from "libhoney";
import { Client } from "pg";

export interface ApplicationContext {
  dbClient: Client;
  honeyClient: Libhoney | null;
  queue: Array<ProveRequest>;
  stampStatus: Map<string, StampStatus>;
  stampResult: Map<string, ProveResponse>;
}
