import { useStytch } from "@stytch/react";
import { useEffect } from "react";
import { SESSION_DURATION_MINUTES } from "../constants";

/**
 * If the current user session exists, return the current JWT and refresh
 * the session on mount and before it expires. Otherwise, return undefined.
 */
export function useJWT(): string | undefined {
  const { session } = useStytch();
  useEffect(() => {
    const refresh = (): void => {
      if (session.getSync()) {
        session.authenticate({
          session_duration_minutes: SESSION_DURATION_MINUTES
        });
      }
    };
    // Refresh session on mount and halfway through the session.
    refresh();
    const interval = setTimeout(refresh, SESSION_DURATION_MINUTES / 2);
    return () => clearTimeout(interval);
  }, [session]);
  const userJWT = session.getTokens()?.session_jwt;
  return userJWT;
}
