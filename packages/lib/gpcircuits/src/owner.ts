import { CircuitSignal } from "./types";

export type OwnerModuleSemaphoreV3Inputs = {
  enabled: CircuitSignal;
  identityNullifier: CircuitSignal;
  identityTrapdoor: CircuitSignal;
  identityCommitment: CircuitSignal;
  externalNullifier: CircuitSignal;
  isNullfierHashRevealed: CircuitSignal;
};

export type OwnerModuleSemaphoreV3nputNamesType = [
  "enabled",
  "identityNullifier",
  "identityTrapdoor",
  "identityCommitment",
  "externalNullifier",
  "isNullfierHashRevealed"
];

export type OwnerModuleSemaphoreV3Outputs = {
  revealedNullifierHash: CircuitSignal;
};

export type OwnerModuleSemaphoreV3OutputNamesType = ["revealedNullifierHash"];
