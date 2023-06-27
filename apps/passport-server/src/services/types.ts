import { Application } from "express";
import * as http from "http";
import { ApplicationContext } from "../types";

export interface Metric {
  (context: ApplicationContext): void;
}

export interface WebServiceResponse<T = string> {
  status: number;
  type: ResponseType;
  value: T;
}

export enum ResponseType {
  HTML = "HTML",
  JSON = "JSON",
  TEXT = "TEXT",
}

export interface ExpressContext {
  app: Application;
  server: http.Server;
}
