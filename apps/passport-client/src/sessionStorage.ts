export function clearAllPendingRequests(): void {
  clearPendingHaloRequest();
  clearPendingGetWithoutProvingRequest();
  clearPendingAddRequest();
}

const pendingGetWithoutProvingRequestKey = "getWithoutProvingRequest";

export function setPendingGetWithoutProvingRequest(request: string): void {
  sessionStorage.setItem(pendingGetWithoutProvingRequestKey, request);
}

export function clearPendingGetWithoutProvingRequest(): void {
  sessionStorage.removeItem(pendingGetWithoutProvingRequestKey);
}

export function getPendingGetWithoutProvingRequest(): string | undefined {
  const value = sessionStorage.getItem(pendingGetWithoutProvingRequestKey);
  return value == null ? undefined : value;
}

const pendingAddRequestKey = "pendingAddRequest";

export function setPendingAddRequest(request: string): void {
  sessionStorage.setItem(pendingAddRequestKey, request);
}

export function clearPendingAddRequest(): void {
  sessionStorage.removeItem(pendingAddRequestKey);
}

export function getPendingAddRequest(): string | undefined {
  const value = sessionStorage.getItem(pendingAddRequestKey);
  return value == null ? undefined : value;
}

const pendingHaloRequestKey = "pendingHaloRequest";

export function setPendingHaloRequest(request: string): void {
  sessionStorage.setItem(pendingHaloRequestKey, request);
}

export function clearPendingHaloRequest(): void {
  sessionStorage.removeItem(pendingHaloRequestKey);
}

export function getPendingHaloRequest(): string | undefined {
  const value = sessionStorage.getItem(pendingHaloRequestKey);
  return value == null ? undefined : value;
}

const pendingProofRequestKey = "pendingProofRequest";

export function setPendingProofRequest(request: string): void {
  sessionStorage.setItem(pendingProofRequestKey, request);
}

export function clearPendingProofRequest(): void {
  sessionStorage.removeItem(pendingProofRequestKey);
}

export function getPendingProofRequest(): string | undefined {
  const value = sessionStorage.getItem(pendingProofRequestKey);
  return value == null ? undefined : value;
}
