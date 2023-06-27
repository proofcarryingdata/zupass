import Libhoney from "libhoney";
import { Pool } from "pg";
import Rollbar from "rollbar";
import { E2EEService } from "./services/e2eeService";
import { EmailTokenService } from "./services/emailTokenService";
import { SemaphoreService } from "./services/semaphoreService";
import { UserService } from "./services/userService";

export interface ApplicationContext {
  dbPool: Pool;
  honeyClient: Libhoney | null;
  rollbar: Rollbar | null;
  // whether this is the version of the application purpose-built for zuzalu,
  // or the generic version
  isZuzalu: boolean;
}

export interface GlobalServices {
  semaphoreService: SemaphoreService;
  userService: UserService;
  e2eeService: E2EEService;
  emailTokenService: EmailTokenService;
}

export interface PCDPass {
  context: ApplicationContext;
  globalServices: GlobalServices;
}
