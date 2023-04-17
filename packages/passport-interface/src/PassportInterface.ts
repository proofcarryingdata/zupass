import { ArgsOf, PCD, PCDPackage } from "@pcd/pcd-types";

export enum PCDRequestType {
  Get = "Get",
  Add = "Add",
}

export interface PCDRequest {
  srcId: string;
  returnUrl: string;
  type: PCDRequestType;
}

export interface GetRequestOptions {
  genericProveScreen?: boolean;
  title?: string;
  description?: string;
  debug?: boolean;
  proveOnServer?: boolean;
}

export interface PCDGetRequest<T extends PCDPackage = PCDPackage>
  extends PCDRequest {
  type: PCDRequestType.Get;
  pcdType: T["name"];
  args: ArgsOf<T>;
  options?: GetRequestOptions;
}

export interface PCDAddRequest extends PCDRequest {
  type: PCDRequestType.Add;
  pcd: PCD;
}

export function constructPassportPcdGetRequestUrl<T extends PCDPackage>(
  passportOrigin: string,
  srcId: string,
  returnUrl: string,
  pcdType: T["name"],
  args: ArgsOf<T>,
  options?: GetRequestOptions
) {
  const req: PCDGetRequest<T> = {
    type: PCDRequestType.Get,
    srcId: srcId,
    returnUrl: returnUrl,
    args: args,
    pcdType,
    options,
  };
  const encReq = encodeURIComponent(JSON.stringify(req));
  return `${passportOrigin}#/prove?request=${encReq}`;
}

export function constructPassportPcdAddRequestUrl(
  passportOrigin: string,
  srcId: string,
  returnUrl: string,
  pcd: PCD
) {
  const req: PCDAddRequest = {
    type: PCDRequestType.Add,
    srcId: srcId,
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
