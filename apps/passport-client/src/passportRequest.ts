import {
  PCDRequest,
  PCDRequestType,
  PendingPCD,
} from "@pcd/passport-interface";
import { SerializedPCD } from "@pcd/pcd-types";

// Ensures that a passport request is safe to process.
export function validateRequest<T extends PCDRequest>(
  params: URLSearchParams
): T {
  const reqJSON = params.get("request");
  if (!reqJSON) {
    throw new Error("Missing request parameter");
  }

  const req = JSON.parse(reqJSON) as T;
  if (!Object.keys(PCDRequestType).includes(req.type)) {
    throw new Error("Invalid request type: " + req.type);
  }

  // Most importantly, validate the returnUrl
  if (!req.returnUrl) {
    throw new Error("Missing returnUrl");
  }
  validateReturnUrl(req.returnUrl);

  // TODO: type-specific validation?

  return req;
}

// A javascript:... returnUrl allows a caller to exfiltrate user secrets.
function validateReturnUrl(returnUrl: string) {
  const url = new URL(returnUrl);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Invalid return URL protocol: " + url.protocol);
  }
  const referrer = new URL(window.document.referrer);
  if (url.origin !== referrer.origin) {
    throw new Error("Invalid return URL origin: " + url.origin);
  }
}

// Redirects to the returnUrl with a pending server proof in the query string.
export function safeRedirectPending(returnUrl: string, pendingPCD: PendingPCD) {
  validateReturnUrl(returnUrl);
  const encPCD = encodeURIComponent(JSON.stringify(pendingPCD));
  window.location.href = `${returnUrl}?encodedPendingPCD=${encPCD}`;
}

// Redirects to the returnUrl with the serialized PCD in the query string.
export function safeRedirect(returnUrl: string, serializedPCD: SerializedPCD) {
  validateReturnUrl(returnUrl);
  const encPCD = encodeURIComponent(JSON.stringify(serializedPCD));
  window.location.href = `${returnUrl}?proof=${encPCD}`;
}
