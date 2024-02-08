import { useStytch } from "@stytch/react";
import { FC, useEffect } from "react";
import { SESSION_DURATION_MINUTES, SESSION_DURATION_MS } from "../constants";

export const RefreshSession: FC = () => {
  const stytchClient = useStytch();

  useEffect(() => {
    const refresh = (): void => {
      if (stytchClient.session.getSync()) {
        const expiresAt = stytchClient.session.getSync()?.expires_at;
        if (expiresAt != null) {
          const expirationDate = new Date(expiresAt);
          if (
            Date.now() >
            expirationDate.getTime() - SESSION_DURATION_MS * 1.3
          ) {
            stytchClient.session.authenticate({
              session_duration_minutes: SESSION_DURATION_MINUTES
            });
          }
        }
      }
    };
    // Refresh session on mount and at intervals of one half the session duration.
    refresh();
    const interval = setInterval(refresh, SESSION_DURATION_MS / 2);
    return () => clearInterval(interval);
  }, [stytchClient]);

  return <></>;
};
