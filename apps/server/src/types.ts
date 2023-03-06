import Libhoney from "libhoney";
import { Client } from "pg";

export interface ApplicationContext {
  dbClient: Client;
  honeyClient: Libhoney | null;
}
