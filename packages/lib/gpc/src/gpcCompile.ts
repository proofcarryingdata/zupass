import {
  ProtoPODGPCCircuitDesc,
  ProtoPODGPCInputs,
  ProtoPODGPCOutputs,
  ProtoPODGPCPublicInputs,
  array2Bits,
  extendedSignalArray
} from "@pcd/gpcircuits";
import {
  PODName,
  PODValue,
  decodePublicKey,
  decodeSignature,
  podNameHash,
  podValueHash
} from "@pcd/pod";
import { BABY_JUB_NEGATIVE_ONE } from "@pcd/util";
import {
  GPCProofConfig,
  GPCProofInputs,
  GPCRevealedClaims,
  GPCRevealedObjectClaims
} from "./gpcTypes";
import { makeWatermarkSignal } from "./gpcUtil";

export function compileProofConfig(
  proofConfig: GPCProofConfig,
  proofInputs: GPCProofInputs,
  circuitDesc: ProtoPODGPCCircuitDesc
): ProtoPODGPCInputs {
  // TODO(POD-P1): This function is too long and needs refactoring ideas:
  // 1) Build the arrays in-place inside a result object to avoid all the vars.
  // 2) Helper functions which build individual module config objects, followed
  //    by a separate function which combines them.
  // 3) Figure out how to share more code with compileVerifyConfig

  // First gather info about the necessary objects and entries into two Maps
  // for later lookups.
  // Objects and entries are both sorted by name.  For entries, the order is by
  // object name first, entry name second (not the same as sorting by qualified
  // name).  Each of the two nested loops below sorts its names, which
  // implicitly creates the desired order in the resulting Maps.  Maps maintain
  // insertion order for the loops below.
  const objMap = new Map();
  const entryMap = new Map();
  let objIndex = 0;
  let entryIndex = 0;
  const objNameOrder = Object.keys(proofConfig.pods).sort();
  for (const objName of objNameOrder) {
    const objConfig = proofConfig.pods[objName];
    if (objConfig === undefined) {
      throw new Error(`Missing config for object ${objName}.`);
    }
    const objPOD = proofInputs.pods[objName];
    if (objPOD === undefined) {
      throw new Error(`Missing POD for object ${objName}.`);
    }

    objMap.set(objName, { objConfig, objPOD, objIndex });

    const entryNameOrder = Object.keys(objConfig.entries).sort();
    for (const entryName of entryNameOrder) {
      const entryConfig = objConfig.entries[entryName];
      if (entryConfig === undefined) {
        throw new Error(`Missing config for entry ${objName}.${entryName}.`);
      }

      const entryQualifiedName = `${objName}.${entryName}`;

      entryMap.set(entryQualifiedName, {
        objName,
        objConfig,
        objPOD,
        objIndex,
        entryName,
        entryConfig,
        entryIndex
      });

      entryIndex++;
    }

    objIndex++;
  }

  // ObjectModule module inputs are 1D arrays indexed by Object.  Some will
  // be packed into bits below.
  const sigObjectContentID = [];
  const sigObjectSignerPubkeyAx = [];
  const sigObjectSignerPubkeyAy = [];
  const sigObjectSignatureR8x = [];
  const sigObjectSignatureR8y = [];
  const sigObjectSignatureS = [];

  // Fill in used ObjectModule inputs from the Object Map.  This loop maintains
  // the order of insertion above.
  for (const objInfo of objMap.values()) {
    const publicKey = decodePublicKey(objInfo.objPOD.signerPublicKey);
    const signature = decodeSignature(objInfo.objPOD.signature);

    sigObjectContentID.push(objInfo.objPOD.contentID);
    sigObjectSignerPubkeyAx.push(publicKey[0]);
    sigObjectSignerPubkeyAy.push(publicKey[1]);
    sigObjectSignatureR8x.push(signature.R8[0]);
    sigObjectSignatureR8y.push(signature.R8[1]);
    sigObjectSignatureS.push(signature.S);
  }

  // Spare object slots get filled in with copies of Object 0.
  for (
    let objIndex = objMap.size;
    objIndex < circuitDesc.maxObjects;
    objIndex++
  ) {
    sigObjectContentID.push(sigObjectContentID[0]);
    sigObjectSignerPubkeyAx.push(sigObjectSignerPubkeyAx[0]);
    sigObjectSignerPubkeyAy.push(sigObjectSignerPubkeyAy[0]);
    sigObjectSignatureR8x.push(sigObjectSignatureR8x[0]);
    sigObjectSignatureR8y.push(sigObjectSignatureR8y[0]);
    sigObjectSignatureS.push(sigObjectSignatureS[0]);
  }

  // EntryModule inputs are 1D arrays indexed entry, excepting siblings which
  // is a 2D array also indexed by tree depth.
  const sigEntryObjectIndex = [];
  const sigEntryNameHash = [];
  const sigEntryProofDepth = [];
  const sigEntryProofIndex = [];
  const sigEntryProofSiblings = [];
  const sigEntryValue = [];
  const sigEntryIsValueEnabled = [];
  const sigEntryIsValueHashRevealed = [];
  const sigEntryEqualToOtherEntryByIndex = [];

  // Fill in used EntryModule inputs from the Entry Map.  This loop maintains
  // the order of insertion above.
  let firstOwnerIndex = 0;
  for (const entryInfo of entryMap.values()) {
    const entrySignals = entryInfo.objPOD.content.generateEntryCircuitSignals(
      entryInfo.entryName
    );

    // Add this entry's basic identity and membership proof for EntryModule.
    sigEntryObjectIndex.push(BigInt(entryInfo.objIndex));
    sigEntryNameHash.push(entrySignals.nameHash);
    sigEntryProofDepth.push(BigInt(entrySignals.proof.siblings.length));
    sigEntryProofIndex.push(BigInt(entrySignals.proof.index));
    sigEntryProofSiblings.push(
      extendedSignalArray(
        entrySignals.proof.siblings,
        circuitDesc.merkleMaxDepth
      )
    );

    // Add this entry's value (if enabled) for EntryModule.
    // Plaintext value is only enabled if it is needed by some other
    // configured constraint, which for now is only the owner commitment.
    const isValueEnabled = !!entryInfo.entryConfig.isOwnerID;
    if (isValueEnabled && entrySignals.value === undefined) {
      throw new Error("Numeric entry value is unavailable when required.");
    }
    sigEntryValue.push(
      isValueEnabled ? entrySignals.value : BABY_JUB_NEGATIVE_ONE
    );
    sigEntryIsValueEnabled.push(isValueEnabled ? 1n : 0n);
    sigEntryIsValueHashRevealed.push(
      entryInfo.entryConfig.isRevealed ? 1n : 0n
    );

    // Deal with equality comparision and ownership, which share circuitry.
    // An entry is always compared either to the first owner entry (to ensure
    // only one owner), or to another entry specified by config, or to itself
    // in order to make the constraint a nop.
    if (entryInfo.entryConfig.isOwnerID) {
      if (firstOwnerIndex === 0) {
        firstOwnerIndex = entryInfo.entryIndex;
      } else if (entryInfo.entryConfig.equalsEntry !== undefined) {
        throw new Error(
          "Can't use isOwnerID and equalsEntry on the same entry."
        );
      }
      sigEntryEqualToOtherEntryByIndex.push(BigInt(firstOwnerIndex));
    } else if (entryInfo.entryConfig.equalsEntry !== undefined) {
      const otherEntryInfo = entryMap.get(entryInfo.entryConfig.equalsEntry);
      if (otherEntryInfo === undefined) {
        throw new Error(
          `Missing entry ${entryInfo.entryConfig.equalsEntry} for equality comparison.`
        );
      }
      sigEntryEqualToOtherEntryByIndex.push(BigInt(otherEntryInfo.entryIndex));
    } else {
      sigEntryEqualToOtherEntryByIndex.push(BigInt(entryInfo.entryIndex));
    }
  }

  // Spare entry slots are filled with the name of Entry 0, with value disabled.
  for (
    let entryIndex = entryMap.size;
    entryIndex < circuitDesc.maxEntries;
    entryIndex++
  ) {
    sigEntryObjectIndex.push(0n);
    sigEntryNameHash.push(sigEntryNameHash[0]);
    sigEntryValue.push(0n);
    sigEntryIsValueEnabled.push(0n);
    sigEntryIsValueHashRevealed.push(0n);
    sigEntryEqualToOtherEntryByIndex.push(BigInt(entryIndex));
    sigEntryProofDepth.push(sigEntryProofDepth[0]);
    sigEntryProofIndex.push(sigEntryProofIndex[0]);
    sigEntryProofSiblings.push([...sigEntryProofSiblings[0]]);
  }

  // Signals for owner module, which is enabled if any entry config declared
  // it was an owner commitment.
  const hasOwner = firstOwnerIndex !== 0;
  if (hasOwner && proofInputs.owner === undefined) {
    throw new Error("Missing owner identity.");
  }
  const sigOwnerEntryIndex = hasOwner
    ? BigInt(firstOwnerIndex)
    : BABY_JUB_NEGATIVE_ONE;
  const sigOwnerSemaphoreV3IdentityNullifier =
    proofInputs.owner?.semaphoreV3?.nullifier ?? BABY_JUB_NEGATIVE_ONE;
  const sigOwnerSemaphoreV3IdentityTrapdoor =
    proofInputs.owner?.semaphoreV3.trapdoor ?? BABY_JUB_NEGATIVE_ONE;
  const sigOwnerExternalNullifier = makeWatermarkSignal(
    proofInputs.owner?.externalNullifier
  );
  const sigOwnerIsNullfierHashRevealed =
    proofInputs.owner?.externalNullifier !== undefined ? 1n : 0n;

  // Set global watermark.
  const sigGlobalWatermark = makeWatermarkSignal(proofInputs.watermark);

  // Return all the resulting signals input to the gpcircuits library.
  return {
    objectContentID: sigObjectContentID,
    objectSignerPubkeyAx: sigObjectSignerPubkeyAx,
    objectSignerPubkeyAy: sigObjectSignerPubkeyAy,
    objectSignatureR8x: sigObjectSignatureR8x,
    objectSignatureR8y: sigObjectSignatureR8y,
    objectSignatureS: sigObjectSignatureS,
    entryObjectIndex: sigEntryObjectIndex,
    entryNameHash: sigEntryNameHash,
    entryValue: sigEntryValue,
    entryIsValueEnabled: array2Bits(sigEntryIsValueEnabled),
    entryIsValueHashRevealed: array2Bits(sigEntryIsValueHashRevealed),
    entryEqualToOtherEntryByIndex: sigEntryEqualToOtherEntryByIndex,
    entryProofDepth: sigEntryProofDepth,
    entryProofIndex: sigEntryProofIndex,
    entryProofSiblings: sigEntryProofSiblings,
    ownerEntryIndex: sigOwnerEntryIndex,
    ownerSemaphoreV3IdentityNullifier: sigOwnerSemaphoreV3IdentityNullifier,
    ownerSemaphoreV3IdentityTrapdoor: sigOwnerSemaphoreV3IdentityTrapdoor,
    ownerExternalNullifier: sigOwnerExternalNullifier,
    ownerIsNullfierHashRevealed: sigOwnerIsNullfierHashRevealed,
    globalWatermark: sigGlobalWatermark
  };
}

export function compileVerifyConfig(
  verifyConfig: GPCProofConfig,
  verifyRevealed: GPCRevealedClaims,
  circuitDesc: ProtoPODGPCCircuitDesc
): {
  circuitPublicInputs: ProtoPODGPCPublicInputs;
  circuitOutputs: ProtoPODGPCOutputs;
} {
  // TODO(POD-P1): This function is too long and needs refactoring ideas:
  // 1) Build the arrays in-place inside a result object to avoid all the vars.
  // 2) Helper functions which build individual module config objects, followed
  //    by a separate function which combines them.
  // 3) Figure out how to share more code with compileVerifyConfig

  // First gather info about the necessary objects and entries into two Maps
  // for later lookups.
  // Objects and entries are both sorted by name.  For entries, the order is by
  // object name first, entry name second (not the same as sorting by qualified
  // name).  Each of the two nested loops below sorts its names, which
  // implicitly creates the desired order in the resulting Maps.  Maps maintain
  // insertion order for the loops below.
  const objMap = new Map();
  const entryMap = new Map();
  let objIndex = 0;
  let entryIndex = 0;
  const objNameOrder = Object.keys(verifyConfig.pods).sort();
  for (const objName of objNameOrder) {
    const objConfig = verifyConfig.pods[objName];
    if (objConfig === undefined) {
      throw new Error(`Missing config for object ${objName}.`);
    }
    const objRevealed = verifyRevealed.pods[objName];
    if (objRevealed === undefined) {
      throw new Error(`Missing POD for object ${objName}.`);
    }

    objMap.set(objName, { objConfig, objRevealed, objIndex });

    const entryNameOrder = Object.keys(objConfig.entries).sort();
    for (const entryName of entryNameOrder) {
      const entryConfig = objConfig.entries[entryName];
      if (entryConfig === undefined) {
        throw new Error(`Missing config for entry ${objName}.${entryName}.`);
      }

      const entryQualifiedName = `${objName}.${entryName}`;
      let entryValue = undefined;
      if (entryConfig.isRevealed) {
        if (objRevealed.entries === undefined) {
          throw new Error("Missing revealed entries.");
        }
        entryValue = objRevealed.entries[entryName];
        if (entryValue === undefined) {
          throw new Error(`Missing revealed entry ${objName}.${entryName}.`);
        }
      }

      entryMap.set(entryQualifiedName, {
        objName,
        objConfig,
        objRevealed,
        objIndex,
        entryName,
        entryConfig,
        entryIndex,
        entryValue
      });

      entryIndex++;
    }

    objIndex++;
  }

  // ObjectModule module inputs are 1D arrays indexed by Object.  Some will
  // be packed into bits below.
  const sigObjectSignerPubkeyAx = [];
  const sigObjectSignerPubkeyAy = [];

  // Fill in used ObjectModule inputs from the Object Map.  This loop maintains
  // the order of insertion above.
  for (const objInfo of objMap.values()) {
    const publicKey = decodePublicKey(objInfo.objRevealed.signerPublicKey);

    sigObjectSignerPubkeyAx.push(publicKey[0]);
    sigObjectSignerPubkeyAy.push(publicKey[1]);
  }

  // Spare object slots get filled in with copies of Object 0.
  for (
    let objIndex = objMap.size;
    objIndex < circuitDesc.maxObjects;
    objIndex++
  ) {
    sigObjectSignerPubkeyAx.push(sigObjectSignerPubkeyAx[0]);
    sigObjectSignerPubkeyAy.push(sigObjectSignerPubkeyAy[0]);
  }

  // EntryModule inputs are 1D arrays indexed entry.
  const sigEntryObjectIndex = [];
  const sigEntryNameHash = [];
  const sigEntryIsValueEnabled = [];
  const sigEntryIsValueHashRevealed = [];
  const sigEntryRevealedValueHash = [];
  const sigEntryEqualToOtherEntryByIndex = [];

  // Fill in used EntryModule inputs from the Entry Map.  This loop maintains
  // the order of insertion above.
  let firstOwnerIndex = 0;
  for (const entryInfo of entryMap.values()) {
    // Add this entry's basic identity and membership proof for EntryModule.
    sigEntryObjectIndex.push(BigInt(entryInfo.objIndex));
    sigEntryNameHash.push(podNameHash(entryInfo.entryName));

    // Add this entry's value config EntryModule.
    // Plaintext value is only enabled if it is needed by some other
    // configured constraint, which for now is only the owner commitment.
    const isValueEnabled = !!entryInfo.entryConfig.isOwnerID;
    sigEntryIsValueEnabled.push(isValueEnabled ? 1n : 0n);
    sigEntryIsValueHashRevealed.push(
      entryInfo.entryConfig.isRevealed ? 1n : 0n
    );
    sigEntryRevealedValueHash.push(
      entryInfo.entryConfig.isRevealed
        ? podValueHash(entryInfo.entryValue)
        : BABY_JUB_NEGATIVE_ONE
    );

    // Deal with equality comparision and ownership, which share circuitry.
    // An entry is always compared either to the first owner entry (to ensure
    // only one owner), or to another entry specified by config, or to itself
    // in order to make the constraint a nop.
    if (entryInfo.entryConfig.isOwnerID) {
      if (firstOwnerIndex === 0) {
        firstOwnerIndex = entryInfo.entryIndex;
      } else if (entryInfo.entryConfig.equalsEntry !== undefined) {
        throw new Error(
          "Can't use isOwnerID and equalsEntry on the same entry."
        );
      }
      sigEntryEqualToOtherEntryByIndex.push(BigInt(firstOwnerIndex));
    } else if (entryInfo.entryConfig.equalsEntry !== undefined) {
      const otherEntryInfo = entryMap.get(entryInfo.entryConfig.equalsEntry);
      if (otherEntryInfo === undefined) {
        throw new Error(
          `Missing entry ${entryInfo.entryConfig.equalsEntry} for equality comparison.`
        );
      }
      sigEntryEqualToOtherEntryByIndex.push(BigInt(otherEntryInfo.entryIndex));
    } else {
      sigEntryEqualToOtherEntryByIndex.push(BigInt(entryInfo.entryIndex));
    }
  }

  // Spare entry slots are filled with the name of Entry 0, with value disabled.
  for (
    let entryIndex = entryMap.size;
    entryIndex < circuitDesc.maxEntries;
    entryIndex++
  ) {
    sigEntryObjectIndex.push(0n);
    sigEntryNameHash.push(sigEntryNameHash[0]);
    sigEntryIsValueEnabled.push(0n);
    sigEntryIsValueHashRevealed.push(0n);
    sigEntryRevealedValueHash.push(BABY_JUB_NEGATIVE_ONE);
    sigEntryEqualToOtherEntryByIndex.push(BigInt(entryIndex));
  }

  // Signals for owner module, which is enabled if any entry config declared
  // it was an owner commitment.
  const hasOwner = firstOwnerIndex !== 0;
  const sigOwnerEntryIndex = hasOwner
    ? BigInt(firstOwnerIndex)
    : BABY_JUB_NEGATIVE_ONE;
  const sigOwnerExternalNullifier = makeWatermarkSignal(
    verifyRevealed.owner?.externalNullifier
  );
  const sigOwnerIsNullfierHashRevealed =
    verifyRevealed.owner?.nullifierHash !== undefined ? 1n : 0n;
  const sigOwnerRevealedNulifierHash =
    verifyRevealed.owner?.nullifierHash ?? BABY_JUB_NEGATIVE_ONE;

  // Set global watermark.
  const sigGlobalWatermark = makeWatermarkSignal(verifyRevealed.watermark);

  // Return all the resulting signals input to the gpcircuits library.
  return {
    circuitPublicInputs: {
      objectSignerPubkeyAx: sigObjectSignerPubkeyAx,
      objectSignerPubkeyAy: sigObjectSignerPubkeyAy,
      entryObjectIndex: sigEntryObjectIndex,
      entryNameHash: sigEntryNameHash,
      entryIsValueEnabled: array2Bits(sigEntryIsValueEnabled),
      entryIsValueHashRevealed: array2Bits(sigEntryIsValueHashRevealed),
      entryEqualToOtherEntryByIndex: sigEntryEqualToOtherEntryByIndex,
      ownerEntryIndex: sigOwnerEntryIndex,
      ownerExternalNullifier: sigOwnerExternalNullifier,
      ownerIsNullfierHashRevealed: sigOwnerIsNullfierHashRevealed,
      globalWatermark: sigGlobalWatermark
    },
    circuitOutputs: {
      entryRevealedValueHash: sigEntryRevealedValueHash,
      ownerRevealedNulifierHash: sigOwnerRevealedNulifierHash
    }
  };
}

export function makeRevealedClaims(
  proofConfig: GPCProofConfig,
  proofInputs: GPCProofInputs,
  circuitOutputs: ProtoPODGPCOutputs
): GPCRevealedClaims {
  const revealedObjects: Record<PODName, GPCRevealedObjectClaims> = {};
  for (const [objName, objConfig] of Object.entries(proofConfig.pods)) {
    const pod = proofInputs.pods[objName];
    if (pod === undefined) {
      throw new ReferenceError(`Missing revealed POD ${objName}.`);
    }
    let anyRevealedEntries = false;
    const revealedEntries: Record<PODName, PODValue> = {};
    for (const [entryName, entryConfig] of Object.entries(objConfig.entries)) {
      if (entryConfig.isRevealed) {
        anyRevealedEntries = true;
        const entryValue = pod.content.getValue(entryName);
        if (entryValue === undefined) {
          throw new ReferenceError(
            `Missing revealed POD entry ${objName}.${entryName}.`
          );
        }
        revealedEntries[entryName] = entryValue;
      }
    }
    revealedObjects[objName] = {
      ...(anyRevealedEntries ? { entries: revealedEntries } : {}),
      signerPublicKey: pod.signerPublicKey
    };
  }

  return {
    pods: revealedObjects,
    ...(proofInputs.owner?.externalNullifier !== undefined
      ? {
          owner: {
            externalNullifier: proofInputs.owner.externalNullifier,
            nullifierHash: BigInt(circuitOutputs.ownerRevealedNulifierHash)
          }
        }
      : {}),
    ...(proofInputs.watermark !== undefined
      ? { watermark: proofInputs.watermark }
      : {})
  };
}
