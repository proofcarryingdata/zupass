import { ApplicationContext } from "../types";

export interface ServiceInitializer {
  (context: ApplicationContext): Promise<unknown>;
}

interface Metric {}
