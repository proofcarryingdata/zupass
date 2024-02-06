import { useStytch } from "@stytch/react";
import { FC, useEffect } from "react";
import { SESSION_DURATION_MINUTES } from "../constants";

export const RefreshSession: FC = () => {
  const stytchClient = useStytch();

  useEffect(() => {
    const refresh = (): void => {
      if (stytchClient.session.getSync()) {
        stytchClient.session.authenticate({
          session_duration_minutes: SESSION_DURATION_MINUTES
        });
      }
    };
    // Refresh session on mount and halfway through the session.
    refresh();
    const interval = setInterval(refresh, SESSION_DURATION_MINUTES / 2);
    return () => clearInterval(interval);
  }, [stytchClient]);

  return <></>;
};
