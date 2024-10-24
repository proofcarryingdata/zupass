import { ProveResult } from "@parcnet-js/client-rpc";
import { PODData, PodspecProofRequest } from "@parcnet-js/podspec";
import type { GPCIdentifier } from "@pcd/gpc";
import { PCDGetRequest } from "@pcd/passport-interface";
import { SerializedPCD } from "@pcd/pcd-types";
import type { PODEntries } from "@pcd/pod";

export enum EmbeddedScreenType {
  EmbeddedGetRequest,
  EmbeddedGPCProof,
  EmbeddedSignPOD
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
  circuitIdentifier?: GPCIdentifier;
  callback: (result: ProveResult) => void;
}

export interface EmbeddedSignPOD {
  type: EmbeddedScreenType.EmbeddedSignPOD;
  entries: PODEntries;
  callback: (result: PODData) => void;
  onCancel: () => void;
}

export interface EmbeddedScreenState {
  screen?: EmbeddedGetRequest | EmbeddedGPCProof | EmbeddedSignPOD;
}
