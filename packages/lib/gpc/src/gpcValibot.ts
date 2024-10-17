// All of these modules being separated by type allows them to expose a common
// structure which makes for readable patterns in code.  Re-exporting them all
// here with custom names allows an IDE to auto-import these symbols as
// necessary, which doesn't work if every use site has to use an `import * as`
// directive directly.

export * as ValibotBoundConfig from "../src/valibot/boundConfig";
export * as ValidbotCircuitIdentifier from "../src/valibot/circuitIdentifier";
export * as ValibotClosedInterval from "../src/valibot/closedInterval";
export * as ValibotPODEntryIdentifier from "../src/valibot/podEntryIdentifier";
export * as ValibotPODName from "../src/valibot/podName";
export * as ValibotPODValue from "../src/valibot/podValue";
export * as ValibotProofConfig from "../src/valibot/proofConfig";
export * as ValibotProofEntryConfig from "../src/valibot/proofEntryConfig";
export * as ValibotProofEntryConfigCommon from "../src/valibot/proofEntryConfigCommon";
export * as ValibotProofObjectConfig from "../src/valibot/proofObjectConfig";
export * as ValibotProofTupleConfig from "../src/valibot/proofTupleConfig";
export * as ValibotBigInt from "./valibot/bigint";
