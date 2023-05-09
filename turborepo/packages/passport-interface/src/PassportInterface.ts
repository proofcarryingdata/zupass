import { ArgsOf, PCDPackage, SerializedPCD } from "@pcd/pcd-types";

export enum PCDRequestType {
  Get = "Get",
  GetWithoutProving = "GetWithoutProving",
  Add = "Add",
  ProveAndAdd = "ProveAndAdd",
}

export interface PCDRequest {
  returnUrl: string;
  type: PCDRequestType;
}

export interface ProveOptions {
  genericProveScreen?: boolean;
  title?: string;
  description?: string;
  debug?: boolean;
  proveOnServer?: boolean;
  signIn?: boolean;
}

/**
 * When a website uses the passport for signing in, the passport
 * signs this payload using a `SemaphoreSignaturePCD`.
 */
export interface SignInMessagePayload {
  uuid: string;
  referrer: string;
}

export interface PCDGetRequest<T extends PCDPackage = PCDPackage>
  extends PCDRequest {
  type: PCDRequestType.Get;
  pcdType: T["name"];
  args: ArgsOf<T>;
  options?: ProveOptions;
}

export interface PCDGetWithoutProvingRequest extends PCDRequest {
  pcdType: string;
}

export interface PCDAddRequest extends PCDRequest {
  type: PCDRequestType.Add;
  pcd: SerializedPCD;
}

export interface PCDProveAndAddRequest<T extends PCDPackage = PCDPackage>
  extends PCDRequest {
  type: PCDRequestType.ProveAndAdd;
  pcdType: string;
  args: ArgsOf<T>;
  options?: ProveOptions;
}

export function getWithoutProvingUrl(
  passportOrigin: string,
  returnUrl: string,
  pcdType: string
) {
  const req: PCDGetWithoutProvingRequest = {
    type: PCDRequestType.GetWithoutProving,
    pcdType,
    returnUrl,
  };
  const encReq = encodeURIComponent(JSON.stringify(req));
  return `${passportOrigin}#/get-without-proving?request=${encReq}`;
}

export function constructPassportPcdGetRequestUrl<T extends PCDPackage>(
  passportOrigin: string,
  returnUrl: string,
  pcdType: T["name"],
  args: ArgsOf<T>,
  options?: ProveOptions
) {
  const req: PCDGetRequest<T> = {
    type: PCDRequestType.Get,
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
  returnUrl: string,
  pcd: SerializedPCD
) {
  const req: PCDAddRequest = {
    type: PCDRequestType.Add,
    returnUrl: returnUrl,
    pcd,
  };
  const eqReq = encodeURIComponent(JSON.stringify(req));
  return `${passportOrigin}#/add?request=${eqReq}`;
}

export function constructPassportPcdProveAndAddRequestUrl<
  T extends PCDPackage = PCDPackage
>(
  passportOrigin: string,
  returnUrl: string,
  pcdType: string,
  args: ArgsOf<T>,
  options?: ProveOptions
) {
  const req: PCDProveAndAddRequest = {
    type: PCDRequestType.ProveAndAdd,
    returnUrl: returnUrl,
    pcdType,
    args,
    options,
  };
  const eqReq = encodeURIComponent(JSON.stringify(req));
  return `${passportOrigin}#/add?request=${eqReq}`;
}
