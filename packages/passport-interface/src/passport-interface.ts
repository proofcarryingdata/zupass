import { PCD } from "pcd-types";

export enum PCDRequestType {
  Get = "Get",
  Add = "Add",
}

export interface PCDRequest {
  returnUrl: string;
  type: PCDRequestType;
}

export interface PCDGetRequest extends PCDRequest {
  type: PCDRequestType.Get;
  pcdType: string;
  params: any;
}

export interface PCDAddRequest extends PCDRequest {
  type: PCDRequestType.Add;
  pcd: PCD;
}

export function constructPassportPcdGetRequestUrl(
  passportOrigin: string,
  returnUrl: string,
  pcdType: string,
  parameters: any
) {
  const req: PCDGetRequest = {
    type: PCDRequestType.Get,
    returnUrl: returnUrl,
    params: parameters,
    pcdType,
  };
  const encReq = encodeURIComponent(JSON.stringify(req));
  return `${passportOrigin}#/prove?request=${encReq}`;
}

export function constructPassportPcdAddRequestUrl(
  passportOrigin: string,
  returnUrl: string,
  pcd: PCD
) {
  const req: PCDAddRequest = {
    type: PCDRequestType.Add,
    returnUrl: returnUrl,
    pcd,
  };
  return `${passportOrigin}?request=${JSON.stringify(req)}`;
}

// export function passportReceiveRequest(
//   url: string
// ): PCDGetRequest | PCDAddRequest | undefined {
//   const URL = new URLSearchParams(url);

//   const request = JSON.parse(URL.get("request") || "");

//   if (isPassportAddRequest(request)) {
//     return request;
//   }

//   if (isPassportGetRequest(request)) {
//     return request;
//   }

//   return undefined;
// }

// export function isPassportGetRequest(req: any): req is PCDGetRequest {
//   return req.type === PCDRequestType.Get;
// }

// export function isPassportAddRequest(req: any): req is PCDAddRequest {
//   return req.type === PCDRequestType.Add;
// }
