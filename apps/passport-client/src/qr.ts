export function makeEncodedVerifyLink(encodedPCD: string): string {
  const link = `${
    window.location.origin
  }#/verify-devconnect?pcd=${encodeURIComponent(encodedPCD)}`;
  return link;
}
