import { useStytch } from "@stytch/react";
import { IS_PROD } from "../constants";

/**
 * If stytch is configured, return an instance of stytch. Otherwise return undefined.
 */
export function useWrappedStytch(): ReturnType<typeof useStytch> | undefined {
  if (process.env.STYTCH_PUBLIC_TOKEN) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useStytch();
  } else if (IS_PROD) {
    throw new Error("expected to be using stytch in prod");
  }
  return undefined;
}

/**
 * If the current user session exists, return the current JWT. Otherwise, return undefined.
 */
export function useJWT(): string | undefined {
  const stytchClient = useWrappedStytch();

  if (!stytchClient) {
    return window.localStorage.getItem("local-dev-jwt") ?? undefined;
  }

  const userJWT = stytchClient.session?.getTokens()?.session_jwt;
  return userJWT;
}
