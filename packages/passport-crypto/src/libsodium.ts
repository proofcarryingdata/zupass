import _sodium from "libsodium-wrappers-sumo";

export async function getSodium() {
  await _sodium.ready;
  return _sodium;
}

export type Sodium = Awaited<ReturnType<typeof getSodium>>;
