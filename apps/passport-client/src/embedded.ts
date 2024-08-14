import { PCDGetRequest } from "@pcd/passport-interface";
import { SerializedPCD } from "@pcd/pcd-types";

export enum EmbeddedScreenType {
  EmbeddedGetRequest,
  EmbeddedAccessRequest
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

export interface EmbeddedScreenState {
  screen?: EmbeddedGetRequest | EmbeddedAccessRequest;
}
