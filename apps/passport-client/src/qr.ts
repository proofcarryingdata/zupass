export function makeEncodedVerifyLink(encodedPCD: string): string {
  const link = `${window.location.origin}#/verify?pcd=${encodeURIComponent(
    encodedPCD
  )}`;
  return link;
}
