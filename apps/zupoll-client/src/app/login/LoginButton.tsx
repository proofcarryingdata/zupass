import { cn } from "@/lib/utils";
import { LoginConfig } from "@pcd/zupoll-shared";
import stableStringify from "json-stable-stringify";
import React from "react";
import { Button, ButtonProps } from "../../@/components/ui/button";
import { openGroupMembershipPopup } from "../../util";

export interface LoginButtonProps {
  serverLoading: boolean;
  setServerLoading: (loading: boolean) => void;
  config: LoginConfig;
  variant?: ButtonProps["variant"];
  className?: string;
  children?: React.ReactNode[] | React.ReactNode | null;
}

export function redirectForLogin(config: LoginConfig) {
  openGroupMembershipPopup(
    config.passportAppUrl,
    window.location.origin + "/popup",
    config.groupUrl,
    "zupoll",
    undefined,
    undefined,
    window.location.origin +
      `?config=${encodeURIComponent(stableStringify(config))}`,
    window.location.origin
  );
}

/**
 * Login for the user who belongs to the specified semaphore group.
 * Generate a semaphore proof, calls the /login endpoint on the server, and
 * gets a JWT. The JWT can be used to make other requests to the server.
 * @param onLoggedIn a callback function which will be called after the user
 * logged in with the JWT.
 */
export const LoginButton = React.forwardRef<
  HTMLButtonElement,
  LoginButtonProps
>(function (
  {
    serverLoading,
    setServerLoading,
    children,
    config,
    variant,
    className
  }: LoginButtonProps,
  ref
) {
  return (
    <Button
      ref={ref}
      variant={variant}
      onClick={() => {
        setServerLoading(true);
        redirectForLogin(config);
      }}
      disabled={serverLoading}
      className={cn(className)}
    >
      {children}
    </Button>
  );
});
LoginButton.displayName = "LoginButton";
