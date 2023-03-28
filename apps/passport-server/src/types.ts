import Libhoney from "libhoney";
import { Client } from "pg";
import Rollbar from "rollbar";

export interface ApplicationContext {
  dbClient: Client;
  honeyClient: Libhoney | null;
  rollbar: Rollbar | null;
}
