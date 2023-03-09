import { PCD } from "pcd-types";

enum PCDRequestType {
  Get = "Get",
  Add = "Add",
}

export interface PCDResponse {
  request: PCDRequest;
  response: any;
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
  return `${passportOrigin}?request=${encodeURIComponent(JSON.stringify(req))}`;
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

export function passportReceiveRequest(
  url: string
): PCDGetRequest | PCDAddRequest | undefined {
  const params = new URLSearchParams(new URL(url).search);

  const request = JSON.parse(params.get("request") || "");

  if (isPassportAddRequest(request)) {
    return request;
  }

  if (isPassportGetRequest(request)) {
    return request;
  }

  return undefined;
}

export function passportResponseUrl(callbackUrl: string, response: any) {
  return `${callbackUrl}&passport-response=${JSON.stringify(response)}`;
}

export function receiveResponseFromPassport(url: string): any {
  const params = new URLSearchParams(new URL(url).search);
  const response = params.get("a") ?? "{}";

  return JSON.parse(response);
}

export function isPassportGetRequest(req: any): req is PCDGetRequest {
  return req.type === PCDRequestType.Get;
}

export function isPassportAddRequest(req: any): req is PCDAddRequest {
  return req.type === PCDRequestType.Add;
}
