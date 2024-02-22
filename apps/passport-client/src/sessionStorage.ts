export function clearAllPendingRequests(): void {
  clearPendingHaloRequest();
  clearPendingGetWithoutProvingRequest();
  clearPendingAddRequest();
  clearPendingProofRequest();
  clearPendingViewSubscriptionsRequest();
  clearPendingAddSubscriptionRequest();
  clearPendingPodboxScannedRequest();
}

export function hasPendingRequest(): boolean {
  return !!(
    getPendingGetWithoutProvingRequest() ||
    getPendingAddRequest() ||
    getPendingHaloRequest() ||
    getPendingProofRequest() ||
    getPendingViewSubscriptionsPageRequest() ||
    getPendingAddSubscriptionPageRequest() ||
    getPendingViewFrogCryptoPageRequest() ||
    getPendingPodboxScannedRequest()
  );
}

export const pendingGetWithoutProvingRequestKey = "getWithoutProvingRequest";

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

export const pendingAddRequestKey = "pendingAddRequest";

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

export const pendingHaloRequestKey = "pendingHaloRequest";

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

export const pendingProofRequestKey = "pendingProofRequest";

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

export const pendingViewSubscriptionsRequestKey = "pendingViewSubscriptions";

export function setPendingViewSubscriptionsRequest(request: string): void {
  sessionStorage.setItem(pendingViewSubscriptionsRequestKey, request);
}

export function clearPendingViewSubscriptionsRequest(): void {
  sessionStorage.removeItem(pendingViewSubscriptionsRequestKey);
}

export function getPendingViewSubscriptionsPageRequest(): string | undefined {
  const value = sessionStorage.getItem(pendingViewSubscriptionsRequestKey);
  return value == null ? undefined : value;
}

export const pendingAddSubscriptionRequestKey = "pendingAddSubscription";

export function setPendingAddSubscriptionRequest(request: string): void {
  sessionStorage.setItem(pendingAddSubscriptionRequestKey, request);
}

export function clearPendingAddSubscriptionRequest(): void {
  sessionStorage.removeItem(pendingAddSubscriptionRequestKey);
}

export function getPendingAddSubscriptionPageRequest(): string | undefined {
  const value = sessionStorage.getItem(pendingAddSubscriptionRequestKey);
  return value == null ? undefined : value;
}

export const pendingViewFrogCryptoRequestKey = "pendingViewFrogCrypto";

export function setPendingViewFrogCryptoRequest(request: string): void {
  sessionStorage.setItem(pendingViewFrogCryptoRequestKey, request);
}

export function clearPendingViewFrogCryptoRequest(): void {
  sessionStorage.removeItem(pendingViewFrogCryptoRequestKey);
}

export function getPendingViewFrogCryptoPageRequest(): string | undefined {
  const value = sessionStorage.getItem(pendingViewFrogCryptoRequestKey);
  return value == null ? undefined : value;
}

export const pendingPodboxScannedRequestKey = "pendingPodboxScannedRequestKey";

export function setPendingPodboxScannedRequest(request: string): void {
  sessionStorage.setItem(pendingPodboxScannedRequestKey, request);
}

export function clearPendingPodboxScannedRequest(): void {
  sessionStorage.removeItem(pendingPodboxScannedRequestKey);
}

export function getPendingPodboxScannedRequest(): string | undefined {
  const value = sessionStorage.getItem(pendingPodboxScannedRequestKey);
  return value == null ? undefined : value;
}
