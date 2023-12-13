import _sodium from "libsodium-wrappers-sumo";

export async function getSodium() {
  await _sodium.ready.catch((err) => {
    console.error("[Worker] libsodium error:", err);
  });
  return _sodium;
}

export type Sodium = Awaited<ReturnType<typeof getSodium>>;
