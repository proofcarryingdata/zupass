import { causalChain, isError } from "@pcd/util";
import Rollbar from "rollbar";

export class RollbarService {
  private rollbar: Rollbar;

  public constructor(
    rollbarToken: string,
    rollbarEnvironmentName: string,
    gitCommitHash: string
  ) {
    this.rollbar = new Rollbar({
      accessToken: rollbarToken,
      captureUncaught: true,
      captureUnhandledRejections: true,
      // this method allows us to intercept 'items' that are scheduled
      // to be uploaded to rollbar, and determine if we should ignore them
      checkIgnore: (isUncaught, args, item): boolean => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const itemAsAny = item as any;
        const itemErrorMessage =
          itemAsAny?.body?.trace_chain?.[0]?.exception?.message;

        // for some reason, correctly-caught connection terminated errors
        // are interpreted as uncaught by rollbar. ignore them to prevent
        // error spam, so that we can keep tabs on legitimate errors properly.
        if (
          typeof itemErrorMessage === "string" &&
          itemErrorMessage.includes("Connection terminated unexpectedly")
        ) {
          return true;
        } else {
          return false;
        }
      },
      environment: rollbarEnvironmentName,
      payload: {
        custom: { gitCommitHash }
      }
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public reportError(e: any): void {
    if (isError(e)) {
      this.rollbar.error(...causalChain(e));
    } else {
      this.rollbar.error(e);
    }
  }

  public log(log: string): void {
    this.rollbar.log(log);
  }
}
