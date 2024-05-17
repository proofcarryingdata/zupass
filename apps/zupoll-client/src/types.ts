import { LoginConfig } from "@pcd/zupoll-shared";

export type ZupollError = {
  /** Big title, should be under 40 chars */
  title: string;
  /** Useful explanation, avoid "Something went wrong." */
  message: string | React.ReactNode;
  /** Less aggressive errors are displayed in a more friendly way */
  friendly?: boolean;
  /** Optional stacktrace. */
  stack?: string;
  /** Optional configuration to include a 'login' button in the error dialog */
  loginAs?: {
    categoryId?: string;
    configName?: string;
  };
};

export enum PCDState {
  DEFAULT,
  AWAITING_PCDSTR,
  RECEIVED_PCDSTR
}

export interface LoginState {
  token: string;
  config: LoginConfig;
}
