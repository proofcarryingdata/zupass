import _sodium from "@pcd/libsodium-wrappers-sumo";

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function getSodium() {
  await _sodium.ready.catch((err) => {
    console.error("[Worker] libsodium error:", err);
  });
  return _sodium;
}

export type Sodium = Awaited<ReturnType<typeof getSodium>>;
