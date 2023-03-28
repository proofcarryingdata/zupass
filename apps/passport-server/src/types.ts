import Libhoney from "libhoney";
import { Pool } from "pg";
import Rollbar from "rollbar";

export interface ApplicationContext {
  dbPool: Pool;
  honeyClient: Libhoney | null;
  rollbar: Rollbar | null;
}
