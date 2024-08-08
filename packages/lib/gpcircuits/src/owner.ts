import { CircuitSignal } from "./types";

export type OwnerModuleSemaphoreV3Inputs = {
  enabled: CircuitSignal;
  identityNullifier: CircuitSignal;
  identityTrapdoor: CircuitSignal;
  identityCommitmentHash: CircuitSignal;
  externalNullifier: CircuitSignal;
  isNullifierHashRevealed: CircuitSignal;
};

export type OwnerModuleSemaphoreV3InputNamesType = [
  "enabled",
  "identityNullifier",
  "identityTrapdoor",
  "identityCommitmentHash",
  "externalNullifier",
  "isNullifierHashRevealed"
];

export type OwnerModuleSemaphoreV3Outputs = {
  revealedNullifierHash: CircuitSignal;
};

export type OwnerModuleSemaphoreV3OutputNamesType = ["revealedNullifierHash"];
