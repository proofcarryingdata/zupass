// yarn 1.xx (which we are using) doesn't support explicitly depending on several
// different versions of a package. Luckily, semaphore provides the identity package
// both as a standalone, and as part of a broader `core` package. Thus, to support
// both versions, we re-export both here, to make the available throughout the rest
// of our codebase.
export { Identity as IdentityV3 } from "@pcd/semaphore-identity-v3-wrapper";
export { Identity as IdentityV4 } from "@semaphore-protocol/identity";
