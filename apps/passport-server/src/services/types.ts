import { ApplicationContext } from "../types";

export interface Metric {
  (context: ApplicationContext): void;
}
