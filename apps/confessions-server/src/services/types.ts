import { ApplicationContext } from "../types";

export interface ServiceInitializer {
  (context: ApplicationContext): void;
}
