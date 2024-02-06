import { useStytch } from "@stytch/react";

/**
 * If the current user session exists, return the current JWT. Otherwise, return undefined.
 */
export function useJWT(): string | undefined {
  const { session } = useStytch();
  const userJWT = session.getTokens()?.session_jwt;
  return userJWT;
}
