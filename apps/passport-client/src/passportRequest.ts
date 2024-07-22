import {
  PCDRequest,
  PCDRequestType,
  PendingPCD
} from "@pcd/passport-interface";
import { SerializedPCD } from "@pcd/pcd-types";

// Ensures that Zupass request is safe to process.
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
function validateReturnUrl(returnUrl: string): void {
  const url = new URL(returnUrl);
  if (url.protocol === "https:") return;
  if (url.protocol === "http:" && url.hostname === "localhost") return;
  throw new Error("Invalid return URL protocol: " + url.protocol);
}

// Redirects to the returnUrl with a pending server proof in the query string.
export function safeRedirectPending(
  returnUrl: string,
  pendingPCD: PendingPCD
): void {
  validateReturnUrl(returnUrl);
  const encPCD = encodeURIComponent(JSON.stringify(pendingPCD));
  window.location.href = `${returnUrl}?encodedPendingPCD=${encPCD}`;
}

// Redirects to the returnUrl with the serialized PCD in the query string.
export function safeRedirect(
  returnUrl: string,
  serializedPCD?: SerializedPCD,
  multiplePCDs?: SerializedPCD[]
): void {
  validateReturnUrl(returnUrl);
  const hasQuery = returnUrl.includes("?");
  const queryMarker = hasQuery ? "&" : "?";

  if (serializedPCD) {
    const encPCD = encodeURIComponent(JSON.stringify(serializedPCD));
    window.location.href = `${returnUrl}${queryMarker}proof=${encPCD}&finished=true`;
  } else if (multiplePCDs) {
    const encPCDs = encodeURIComponent(JSON.stringify(multiplePCDs));
    window.location.href = `${returnUrl}${queryMarker}multi-pcd=${encPCDs}&finished=true`;
  } else {
    window.location.href = `${returnUrl}${queryMarker}finished=true`;
  }
}
