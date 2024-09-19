import { ProveResult } from "@parcnet-js/client-rpc";
import { PodspecProofRequest } from "@parcnet-js/podspec";
import { PCDGetRequest } from "@pcd/passport-interface";
import { SerializedPCD } from "@pcd/pcd-types";

export enum EmbeddedScreenType {
  EmbeddedGetRequest,
  EmbeddedAddSubscription,
  EmbeddedGPCProof
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

export interface EmbeddedGPCProof {
  type: EmbeddedScreenType.EmbeddedGPCProof;
  proofRequest: PodspecProofRequest;
  callback: (result: ProveResult) => void;
}

export interface EmbeddedScreenState {
  screen?: EmbeddedGetRequest | EmbeddedAddSubscription | EmbeddedGPCProof;
}
