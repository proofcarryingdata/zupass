export function clearAllPendingRequests(): void {
  clearPendingHaloRequest();
  clearPendingGetWithoutProvingRequest();
  clearPendingAddRequest();
  clearPendingProofRequest();
  clearPendingViewSubscriptionsRequest();
  clearPendingAddSubscriptionRequest();
  clearPendingGenericIssuanceCheckinRequest();
  clearPendingAuthenticateIFrameRequest();
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
    getPendingGenericIssuanceCheckinRequest() ||
    getPendingAuthenticateIFrameRequest()
  );
}

export const pendingRequestKeys: Record<string, string> = {
  getWithoutProving: "getWithoutProvingRequest",
  add: "pendingAddRequest",
  halo: "pendingHaloRequest",
  proof: "pendingProofRequest",
  viewSubscriptions: "pendingViewSubscriptions",
  addSubscription: "pendingAddSubscription",
  viewFrogCrypto: "pendingViewFrogCrypto",
  genericIssuanceCheckin: "pendingGenericIssuanceCheckin",
  authenticateIFrame: "pendingAuthenticateIFrame"
} as const;

export function setPendingGetWithoutProvingRequest(request: string): void {
  sessionStorage.setItem(pendingRequestKeys.getWithoutProving, request);
}

export function clearPendingGetWithoutProvingRequest(): void {
  sessionStorage.removeItem(pendingRequestKeys.getWithoutProving);
}

export function getPendingGetWithoutProvingRequest(): string | undefined {
  const value = sessionStorage.getItem(pendingRequestKeys.getWithoutProving);
  return value ?? undefined;
}

export function setPendingAddRequest(request: string): void {
  sessionStorage.setItem(pendingRequestKeys.add, request);
}

export function clearPendingAddRequest(): void {
  sessionStorage.removeItem(pendingRequestKeys.add);
}

export function getPendingAddRequest(): string | undefined {
  const value = sessionStorage.getItem(pendingRequestKeys.add);
  return value ?? undefined;
}

export function setPendingHaloRequest(request: string): void {
  sessionStorage.setItem(pendingRequestKeys.halo, request);
}

export function clearPendingHaloRequest(): void {
  sessionStorage.removeItem(pendingRequestKeys.halo);
}

export function getPendingHaloRequest(): string | undefined {
  const value = sessionStorage.getItem(pendingRequestKeys.halo);
  return value ?? undefined;
}

export function setPendingProofRequest(request: string): void {
  sessionStorage.setItem(pendingRequestKeys.proof, request);
}

export function clearPendingProofRequest(): void {
  sessionStorage.removeItem(pendingRequestKeys.proof);
}

export function getPendingProofRequest(): string | undefined {
  const value = sessionStorage.getItem(pendingRequestKeys.proof);
  return value ?? undefined;
}

export function setPendingViewSubscriptionsRequest(request: string): void {
  sessionStorage.setItem(pendingRequestKeys.viewSubscriptions, request);
}

export function clearPendingViewSubscriptionsRequest(): void {
  sessionStorage.removeItem(pendingRequestKeys.viewSubscriptions);
}

export function getPendingViewSubscriptionsPageRequest(): string | undefined {
  const value = sessionStorage.getItem(pendingRequestKeys.viewSubscriptions);
  return value ?? undefined;
}

export function setPendingAddSubscriptionRequest(request: string): void {
  sessionStorage.setItem(pendingRequestKeys.addSubscription, request);
}

export function clearPendingAddSubscriptionRequest(): void {
  sessionStorage.removeItem(pendingRequestKeys.addSubscription);
}

export function getPendingAddSubscriptionPageRequest(): string | undefined {
  const value = sessionStorage.getItem(pendingRequestKeys.addSubscription);
  return value ?? undefined;
}

export function setPendingViewFrogCryptoRequest(request: string): void {
  sessionStorage.setItem(pendingRequestKeys.viewFrogCrypto, request);
}

export function clearPendingViewFrogCryptoRequest(): void {
  sessionStorage.removeItem(pendingRequestKeys.viewFrogCrypto);
}

export function getPendingViewFrogCryptoPageRequest(): string | undefined {
  const value = sessionStorage.getItem(pendingRequestKeys.viewFrogCrypto);
  return value ?? undefined;
}

export function setPendingGenericIssuanceCheckinRequest(request: string): void {
  sessionStorage.setItem(pendingRequestKeys.genericIssuanceCheckin, request);
}

export function clearPendingGenericIssuanceCheckinRequest(): void {
  sessionStorage.removeItem(pendingRequestKeys.genericIssuanceCheckin);
}

export function getPendingGenericIssuanceCheckinRequest(): string | undefined {
  const value = sessionStorage.getItem(
    pendingRequestKeys.genericIssuanceCheckin
  );
  return value ?? undefined;
}

export function setPendingAuthenticateIFrameRequest(request: string): void {
  sessionStorage.setItem(pendingRequestKeys.authenticateIFrame, request);
}

export function clearPendingAuthenticateIFrameRequest(): void {
  sessionStorage.removeItem(pendingRequestKeys.authenticateIFrame);
}

export function getPendingAuthenticateIFrameRequest(): string | undefined {
  const value = sessionStorage.getItem(pendingRequestKeys.authenticateIFrame);
  return value ?? undefined;
}

/**
 * Gets any pending request, if any. Returns undefined if none.
 */
export function getPendingRequest():
  | { key: keyof typeof pendingRequestKeys; value: string }
  | undefined {
  for (const key in pendingRequestKeys) {
    const sessionStorageKey = pendingRequestKeys[key];
    const item = sessionStorage.getItem(sessionStorageKey);
    if (item) {
      return {
        key: key as keyof typeof pendingRequestKeys,
        value: item
      };
    }
  }

  return undefined;
}
