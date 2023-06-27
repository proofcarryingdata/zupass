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
