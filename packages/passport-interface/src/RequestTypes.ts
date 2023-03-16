export interface ProveRequest {
  pcdType: string;
  args: any;
}

export interface ProveResponse {
  serializedPCD: string;
}

export interface VerifyRequest {
  pcdType: string;
  serializedPCD: string;
}

export interface VerifyResponse {
  verified: boolean;
}

export interface SupportedPCDsResponse {
  names: string[];
}
