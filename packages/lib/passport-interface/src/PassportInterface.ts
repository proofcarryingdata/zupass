import { ArgsOf, PCDPackage, SerializedPCD } from "@pcd/pcd-types";
import { PendingPCD } from "./PendingPCDUtils";

export enum PCDRequestType {
  Get = "Get",
  GetWithoutProving = "GetWithoutProving",
  Add = "Add",
  ProveAndAdd = "ProveAndAdd"
}

export interface PCDRequest {
  // The URL to return to after completing the request
  returnUrl: string;
  // Whether or not to post a message to the parent window after completing the
  // request. This allows a non-redirect-based flow for popup windows, and is
  // off by default in the URL construction functions.
  postMessage: boolean;
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
 * When a website uses the Zupass for signing in, Zupass
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
  folder?: string;
}

export interface PCDProveAndAddRequest<T extends PCDPackage = PCDPackage>
  extends PCDRequest {
  type: PCDRequestType.ProveAndAdd;
  pcdType: string;
  args: ArgsOf<T>;
  options?: ProveOptions;
  returnPCD?: boolean;
  folder?: string;
}

export function getWithoutProvingUrl(
  zupassClientUrl: string,
  returnUrl: string,
  pcdType: string,
  postMessage: boolean = false
): string {
  const req: PCDGetWithoutProvingRequest = {
    type: PCDRequestType.GetWithoutProving,
    pcdType,
    returnUrl,
    postMessage
  };
  const encReq = encodeURIComponent(JSON.stringify(req));
  return `${zupassClientUrl}#/get-without-proving?request=${encReq}`;
}

export function constructZupassPcdGetRequestUrl<T extends PCDPackage>(
  zupassClientUrl: string,
  returnUrl: string,
  pcdType: T["name"],
  args: ArgsOf<T>,
  options?: ProveOptions,
  postMessage: boolean = false
): string {
  const req: PCDGetRequest<T> = {
    type: PCDRequestType.Get,
    returnUrl: returnUrl,
    args: args,
    pcdType,
    options,
    postMessage
  };
  const encReq = encodeURIComponent(JSON.stringify(req));
  return `${zupassClientUrl}#/prove?request=${encReq}`;
}

export function constructZupassPcdAddRequestUrl(
  zupassClientUrl: string,
  returnUrl: string,
  pcd: SerializedPCD,
  folder?: string,
  postMessage: boolean = false
): string {
  const req: PCDAddRequest = {
    type: PCDRequestType.Add,
    returnUrl: returnUrl,
    pcd,
    folder,
    postMessage
  };
  const eqReq = encodeURIComponent(JSON.stringify(req));
  return `${zupassClientUrl}#/add?request=${eqReq}`;
}

export function constructZupassPcdProveAndAddRequestUrl<
  T extends PCDPackage = PCDPackage
>(
  zupassClientUrl: string,
  returnUrl: string,
  pcdType: string,
  args: ArgsOf<T>,
  options?: ProveOptions,
  returnPCD?: boolean,
  folder?: string,
  postMessage: boolean = false
): string {
  const req: PCDProveAndAddRequest = {
    type: PCDRequestType.ProveAndAdd,
    returnUrl: returnUrl,
    pcdType,
    args,
    options,
    returnPCD,
    folder,
    postMessage
  };
  const eqReq = encodeURIComponent(JSON.stringify(req));
  return `${zupassClientUrl}#/add?request=${eqReq}`;
}

export function postSerializedPCDMessage(
  window: Window,
  serialized: SerializedPCD
): void {
  window.postMessage({ encodedPCD: JSON.stringify(serialized) }, "*");
}

export function postPendingPCDMessage(
  window: Window,
  pending: PendingPCD
): void {
  window.postMessage({ encodedPendingPCD: JSON.stringify(pending) }, "*");
}

export enum PayloadType {
  RedirectTopicData = "topic-data",
  NullifierHash = "nullifier-hash",
  AnonTopicDataPayload = "anon-topic-data-payload",
  ReactData = "react-data"
}

export type RedirectTopicDataPayload = {
  type: PayloadType.RedirectTopicData;
  value: {
    topicId: number;
    chatId: number;
  };
};

export type NullifierHashPayload = {
  type: PayloadType.NullifierHash;
  value: string;
};

export type AnonTopicDataPayload = {
  type: PayloadType.AnonTopicDataPayload;
  value: {
    chatId: number;
    topicName: string;
    topicId: number;
    validEventIds: string[];
  };
};

export type ReactDataPayload = {
  type: PayloadType.ReactData;
  anonMessageId: string;
  react: string;
};

export type AnonWebAppPayload =
  | RedirectTopicDataPayload
  | NullifierHashPayload
  | AnonTopicDataPayload
  | ReactDataPayload;
