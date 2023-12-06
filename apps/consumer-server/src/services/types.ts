import { ApplicationContext } from "../types";

export interface ServiceInitializer {
  (context: ApplicationContext): void;
}

export interface Metric {
  (context: ApplicationContext): void;
}

export enum MetricName {
  GITHUB_RATE_LIMIT = "GITHUB_RATE_LIMIT"
}
