export { type ProtoPODGPCCircuitDesc } from "@pcd/gpcircuits";
export * from "./gpc";
export * from "./gpcJSON";
export * from "./gpcSerialize";
export * from "./gpcTypes";

// TODO(POD-P4): Make these hidden again if they're unneded.  The pre/post
// prove/verify steps should cover the need, but making these available to
// devs gives them an alternative.
export {
  compileProofConfig,
  compileVerifyConfig,
  makeRevealedClaims
} from "./gpcCompile";
