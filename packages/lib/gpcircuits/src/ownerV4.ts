import { CircuitSignal } from "./types";

export type OwnerModuleSemaphoreV4Inputs = {
  enabled: CircuitSignal;
  secretScalar: CircuitSignal;
  identityCommitmentHash: CircuitSignal;
  externalNullifier: CircuitSignal;
  isNullifierHashRevealed: CircuitSignal;
};

export type OwnerModuleSemaphoreV4nputNamesType = [
  "enabled",
  "secretScalar",
  "identityCommitmentHash",
  "externalNullifier",
  "isNullifierHashRevealed"
];

export type OwnerModuleSemaphoreV4Outputs = {
  revealedNullifierHash: CircuitSignal;
};

export type OwnerModuleSemaphoreV4OutputNamesType = ["revealedNullifierHash"];
