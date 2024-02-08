import { useStytch } from "@stytch/react";

/**
 * If the current user session exists, return the current JWT. Otherwise, return undefined.
 */
export function useJWT(): string | undefined {
  const stytchClient = useStytch();
  const userJWT = stytchClient?.session?.getTokens()?.session_jwt;
  return userJWT;
}
