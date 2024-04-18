import { CircuitSignal } from "./types";

export type ProtoPODGPCInputs = {
  // Object modules [MAX_OBJECTS].
  objectContentID: CircuitSignal /*MAX_OBJECTS*/[];
  /*PUB*/ objectSignerPubkeyAx: CircuitSignal /*MAX_OBJECTS*/[];
  /*PUB*/ objectSignerPubkeyAy: CircuitSignal /*MAX_OBJECTS*/[];
  objectSignatureR8x: CircuitSignal /*MAX_OBJECTS*/[];
  objectSignatureR8y: CircuitSignal /*MAX_OBJECTS*/[];
  objectSignatureS: CircuitSignal /*MAX_OBJECTS*/[];

  // Entry modules [MAX_ENTRIES].
  /*PUB*/ entryObjectIndex: CircuitSignal /*MAX_ENTRIES*/[];
  /*PUB*/ entryNameHash: CircuitSignal /*MAX_ENTRIES*/[];
  entryValue: CircuitSignal /*MAX_ENTRIES*/[];
  /*PUB*/ entryIsValueEnabled: CircuitSignal /*MAX_ENTRIES packed bits*/;
  /*PUB*/ entryIsValueHashRevealed: CircuitSignal /*MAX_ENTRIES packed bits*/;
  entryProofDepth: CircuitSignal /*MAX_ENTRIES*/[];
  entryProofIndex: CircuitSignal /*MAX_ENTRIES*/[] /*MERKLE_MAX_DEPTH packed bits*/;
  entryProofSiblings: CircuitSignal /*MAX_ENTRIES*/[] /*MERKLE_MAX_DEPTH*/[];

  // Entry constraint modules.
  /*PUB*/ entryEqualToOtherEntryByIndex: CircuitSignal /*MAX_ENTRIES*/[];

  // Owner module (1)
  /*PUB*/ ownerEntryIndex: CircuitSignal;
  ownerSemaphoreV3IdentityNullifier: CircuitSignal;
  ownerSemaphoreV3IdentityTrapdoor: CircuitSignal;
  /*PUB*/ ownerExternalNullifier: CircuitSignal;
  /*PUB*/ ownerIsNullfierHashRevealed: CircuitSignal;

  // Global module (1)
  /*PUB*/ globalWatermark: CircuitSignal;
};

export type ProtoPODGPCInputNamesType = [
  "objectContentID",
  "objectSignerPubkeyAx",
  "objectSignerPubkeyAy",
  "objectSignatureR8x",
  "objectSignatureR8y",
  "objectSignatureS",
  "entryObjectIndex",
  "entryNameHash",
  "entryValue",
  "entryIsValueEnabled",
  "entryIsValueHashRevealed",
  "entryProofDepth",
  "entryProofIndex",
  "entryProofSiblings",
  "entryEqualToOtherEntryByIndex",
  "ownerEntryIndex",
  "ownerSemaphoreV3IdentityNullifier",
  "ownerSemaphoreV3IdentityTrapdoor",
  "ownerExternalNullifier",
  "ownerIsNullfierHashRevealed",
  "globalWatermark"
];

export const PROTO_POD_GPC_PUBLIC_INPUT_NAMES = [
  "objectSignerPubkeyAx",
  "objectSignerPubkeyAy",
  "entryObjectIndex",
  "entryNameHash",
  "entryIsValueEnabled",
  "entryIsValueHashRevealed",
  "entryEqualToOtherEntryByIndex",
  "ownerEntryIndex",
  "ownerExternalNullifier",
  "ownerIsNullfierHashRevealed",
  "globalWatermark"
];

export type ProtoPODGPCOutputs = {
  entryRevealedValueHash: CircuitSignal /*MAX_ENTRIES*/[];
  ownerRevealedNulifierHash: CircuitSignal;
};

export type ProtoPODGPCOutputNamesType = [
  "entryRevealedValueHash",
  "ownerRevealedNulifierHash"
];
