import { Application } from "express";
import * as http from "http";
import { ApplicationContext } from "../types";

export interface Metric {
  (context: ApplicationContext): void;
}

export interface ExpressContext {
  app: Application;
  server: http.Server;
}

export enum PretixSyncStatus {
  NotSynced = "NotSynced",
  Synced = "Synced",
  NoPretix = "NoPretix"
}
