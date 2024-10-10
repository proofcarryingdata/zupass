import { ProveResult } from "@parcnet-js/client-rpc";
import { PodspecProofRequest } from "@parcnet-js/podspec";
import { PCDGetRequest } from "@pcd/passport-interface";
import { SerializedPCD } from "@pcd/pcd-types";

export enum EmbeddedScreenType {
  EmbeddedGetRequest,
  EmbeddedGPCProof
}

export interface EmbeddedGetRequest {
  type: EmbeddedScreenType.EmbeddedGetRequest;
  request: PCDGetRequest;
  callback: (serialized: SerializedPCD) => void;
}

export interface EmbeddedGPCProof {
  type: EmbeddedScreenType.EmbeddedGPCProof;
  proofRequest: PodspecProofRequest;
  collectionIds: string[];
  callback: (result: ProveResult) => void;
}

export interface EmbeddedScreenState {
  screen?: EmbeddedGetRequest | EmbeddedGPCProof;
}
