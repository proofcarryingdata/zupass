import { PCD, PCDPackage } from "@pcd/pcd-types";

export enum PCDRequestType {
  Get = "Get",
  Add = "Add",
}

export interface PCDRequest {
  returnUrl: string;
  type: PCDRequestType;
}

type ArgsOf<T> = T extends PCDPackage<unknown, unknown, infer U> ? U : T;

export interface PCDGetRequest<T extends PCDPackage> extends PCDRequest {
  type: PCDRequestType.Get;
  pcdType: T["name"];
  args: ArgsOf<T>;
}

export interface PCDAddRequest extends PCDRequest {
  type: PCDRequestType.Add;
  pcd: PCD;
}

export function constructPassportPcdGetRequestUrl<T extends PCDPackage>(
  passportOrigin: string,
  returnUrl: string,
  pcdType: T["name"],
  args: ArgsOf<T>
) {
  const req: PCDGetRequest<T> = {
    type: PCDRequestType.Get,
    returnUrl: returnUrl,
    args: args,
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
