import _sodium from "@pcd/libsodium-wrappers-sumo";

/*******************************************************
 * We are using a custom build of libsodium that includes only the functions
 * that we make use of. Other libsodium functions may not work.
 *
 * Any use of libsodium should be accompanied by a test which verifies that
 * the functionality relied upon is working.
 *
 * This module is not intended to be exported from the package, and should only
 * be used internally.
 *******************************************************/

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function getSodium() {
  await _sodium.ready.catch((err) => {
    console.error("[Worker] libsodium error:", err);
  });
  return _sodium;
}

export type Sodium = Awaited<ReturnType<typeof getSodium>>;
