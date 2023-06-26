import Libhoney from "libhoney";
import { Pool } from "pg";
import Rollbar from "rollbar";

export interface ApplicationContext {
  dbPool: Pool;
  honeyClient: Libhoney | null;
  rollbar: Rollbar | null;
  // whether this is the version of the application purpose-built for zuzalu,
  // or the generic version
  isZuzalu: boolean;
}
