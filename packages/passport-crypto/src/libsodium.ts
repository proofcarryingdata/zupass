import _sodium from "libsodium-wrappers";

export async function getSodium() {
  await _sodium.ready;
  return _sodium;
}
