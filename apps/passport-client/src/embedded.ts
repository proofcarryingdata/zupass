import { PCDGetRequest } from "@pcd/passport-interface";
import { SerializedPCD } from "@pcd/pcd-types";

export enum EmbeddedScreenType {
  EmbeddedGetRequest,
  EmbeddedAddSubscription
}

export enum ZappEmbeddingMode {
  ZappInsideZupass,
  ZupassInsideZapp
}

export interface EmbeddedGetRequest {
  type: EmbeddedScreenType.EmbeddedGetRequest;
  request: PCDGetRequest;
  callback: (serialized: SerializedPCD) => void;
}

export interface EmbeddedAddSubscription {
  type: EmbeddedScreenType.EmbeddedAddSubscription;
  feedUrl: string;
  feedId: string;
}

export interface ZappScreenState {
  screen?: EmbeddedGetRequest | EmbeddedAddSubscription;
}
