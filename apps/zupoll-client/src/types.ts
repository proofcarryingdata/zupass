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

  loginAs?: {
    title: string;
    categoryId?: string;
    configName?: string;
    ballotURL?: string;
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
