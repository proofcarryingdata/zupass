import { PCDGetRequest } from "@pcd/passport-interface";
import { SerializedPCD } from "@pcd/pcd-types";

export enum EmbeddedScreenType {
  EmbeddedGetRequest,
  EmbeddedAccessRequest,
  EmbeddedAddSubscription,
  EmbeddedInstall
}

export interface EmbeddedGetRequest {
  type: EmbeddedScreenType.EmbeddedGetRequest;
  request: PCDGetRequest;
  callback: (serialized: SerializedPCD) => void;
}

export interface EmbeddedAccessRequest {
  type: EmbeddedScreenType.EmbeddedAccessRequest;
  origin: string;
}

export interface EmbeddedAddSubscription {
  type: EmbeddedScreenType.EmbeddedAddSubscription;
  feedUrl: string;
  feedId: string;
}

export interface EmbeddedInstall {
  type: EmbeddedScreenType.EmbeddedInstall;
}

export interface EmbeddedScreenState {
  screen?: EmbeddedGetRequest | EmbeddedAccessRequest | EmbeddedAddSubscription;
}
