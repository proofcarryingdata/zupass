import { PCD } from "pcd-types";

export interface PCDGetRequest {
  origin: string;
  type: string;
  parameters: any;
  // etc.
}

export interface PCDAddRequest {
  origin: string;
  pcd: PCD;
}

export function constructPassportPcdGetRequestUrl(
  passportOrigin: string,
  pcdType: string,
  parameters: any
) {
  return "";
}

export function receivePassportRequest(
  url: string
): PCDGetRequest | PCDAddRequest {
  return {} as any;
}
