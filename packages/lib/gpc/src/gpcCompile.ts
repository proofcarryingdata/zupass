import {
  CircuitSignal,
  EntryModuleInputs,
  ObjectModuleInputs,
  ProtoPODGPCCircuitDesc,
  ProtoPODGPCInputs,
  ProtoPODGPCOutputs,
  ProtoPODGPCPublicInputs,
  array2Bits,
  computeTupleIndices,
  extendedSignalArray,
  hashTuple,
  padArray,
  paramMaxVirtualEntries
} from "@pcd/gpcircuits";
import {
  POD,
  PODEdDSAPublicKeyValue,
  PODName,
  PODValue,
  PODValueTuple,
  decodePublicKey,
  decodeSignature,
  podNameHash,
  podValueHash
} from "@pcd/pod";
import { BABY_JUB_NEGATIVE_ONE } from "@pcd/util";
import _ from "lodash";
import {
  GPCBoundConfig,
  GPCProofEntryConfig,
  GPCProofInputs,
  GPCProofObjectConfig,
  GPCProofOwnerInputs,
  GPCRevealedClaims,
  GPCRevealedObjectClaims,
  GPCRevealedOwnerClaims,
  PODEntryIdentifier,
  TUPLE_PREFIX,
  TupleIdentifier
} from "./gpcTypes";
import {
  GPCProofMembershipListConfig,
  LIST_MEMBERSHIP,
  dummyBoundsCheckInputs,
  isTupleIdentifier,
  isVirtualEntryIdentifier,
  isVirtualEntryName,
  listConfigFromProofConfig,
  makeWatermarkSignal
} from "./gpcUtil";

/**
 * Per-object info extracted by {@link prepCompilerMaps}.
 */
type CompilerObjInfo<ObjInput> = {
  objName: PODName;
  objIndex: number;
  objConfig: GPCProofObjectConfig;
  objInput: ObjInput | undefined;
};

/**
 * Per-entry info extracted by {@link prepCompilerMaps}.
 * Info about the object containing the entry is duplicated here for
 * quick access.
 */
type CompilerEntryInfo<ObjInput> = {
  objName: PODName;
  objIndex: number;
  objConfig: GPCProofObjectConfig;
  objInput: ObjInput | undefined;
  entryName: PODEntryIdentifier;
  entryIndex: number;
  entryConfig: GPCProofEntryConfig;
};

/**
 * Per-entry info extracted by {@link prepCompilerTupleMap}.
 * This info characterises the result of decomposing a given tuple of arbitrary
 * arity into a sequence of tuples of some fixed arity dictated by the choice of
 * circuit. The field `tupleIndex` contains the index (in the theoretically
 * concatenated entry value hash and tuple value hash array) of the hash of this
 * input tuple, while `tupleInputIndices` contains a sequence of indices representing
 * the aforementioned decomposition of this tuple. Thus, for a list membership
 * check for a tuple value, `tupleIndex` is the required
 * `listComparisonValueIndex`.
 */
type CompilerTupleInfo = { tupleIndex: number; tupleInputIndices: number[][] };

/**
 * Helper function for the first phase of compiling inputs for prove or verify.
 * Config and input information is gathered into maps for easy lookup by
 * name/identifier later.
 *
 * Objects and entries are both sorted by name.  For entries, the order is by
 * object name first, entry name second (not the same as sorting by qualified
 * name as a single string).  Maps maintain insertion order so callers can
 * iterate in the same order.
 *
 * @param config proof config
 * @param inputs input object for prove or verify
 *   (GPCProofInput or GPCRevealedClaims).
 * @returns maps for looking up objects by name, and entries by identifier.
 *   See the map value types for what's included.
 */
function prepCompilerMaps<
  ProofInput extends GPCProofInputs | GPCRevealedClaims,
  ObjInput extends POD | GPCRevealedObjectClaims
>(
  circuitDesc: ProtoPODGPCCircuitDesc,
  config: GPCBoundConfig,
  inputs: ProofInput
): {
  objMap: Map<PODName, CompilerObjInfo<ObjInput>>;
  entryMap: Map<PODEntryIdentifier, CompilerEntryInfo<ObjInput>>;
} {
  // Each of the two nested loops below sorts its names, which
  // implicitly creates the desired order in the resulting Maps.
  const objMap = new Map();
  const entryMap = new Map();
  let objIndex = 0;
  let entryIndex = 0;
  const signerPubKeyEntryIndexOffset = circuitDesc.maxEntries;
  const objNameOrder = Object.keys(config.pods).sort();
  for (const objName of objNameOrder) {
    const objConfig = config.pods[objName];
    if (objConfig === undefined) {
      throw new Error(`Missing config for object ${objName}.`);
    }
    const objInput = inputs.pods[objName];

    // If the object input is undefined, e.g. if nothing is revealed, add the
    // object name to the map anyway for later reference.
    objMap.set(objName, { objConfig, objInput, objIndex });

    // Add virtual entries even if they are not explicitly specified in the
    // config. Unless specified otherwise, they are revealed.
    //
    // TODO(POD-P3): Modify for other virtual entry types when they are available.
    entryMap.set(`${objName}.$signerPublicKey`, {
      objName,
      objIndex,
      objConfig,
      objInput,
      entryName: "$signerPublicKey",
      entryIndex: signerPubKeyEntryIndexOffset + objIndex,
      entryConfig: { isRevealed: objConfig.signerPublicKey?.isRevealed ?? true }
    });

    const entryNameOrder = Object.keys(objConfig.entries).sort();
    for (const entryName of entryNameOrder) {
      const entryConfig = objConfig.entries[entryName];
      if (entryConfig === undefined) {
        throw new Error(`Missing config for entry ${objName}.${entryName}.`);
      }

      const entryQualifiedName = `${objName}.${entryName}`;

      entryMap.set(entryQualifiedName, {
        objName,
        objIndex,
        objConfig,
        objInput,
        entryName,
        entryIndex,
        entryConfig
      });

      entryIndex++;
    }

    objIndex++;
  }

  return { objMap, entryMap };
}

/**
 * Helper function for the tuple compilation phase for prove or verify.  Input
 * information is gathered into a map for easy lookup by name when compiling
 * data that depends on tuples. All tuple names are prefixed with
 * "${TUPLE_PREFIX}.".
 *
 * The tuples are sorted by name before they are processed.
 *
 * @param config proof config
 * @param entryMap map for looking up entries by identifier
 * @param paramMaxEntries maximum number of entries allowed by the chosen
 * circuit description.
 * @param paramMaxTuples maximum number of tuples allowed by the chosen
 * circuit description.
 * @param paramTupleArity tuple arity used by the chosen circuit description.
 * @returns map for looking up tuples by identifier
 */
function prepCompilerTupleMap<ObjInput extends POD | GPCRevealedObjectClaims>(
  config: GPCBoundConfig,
  entryMap: Map<PODEntryIdentifier, CompilerEntryInfo<ObjInput>>,
  circuitDesc: ProtoPODGPCCircuitDesc
): Map<TupleIdentifier, CompilerTupleInfo> {
  // And now for the tuple map, which is sorted in alphabetical order and
  // populated with the corresponding values from entryMap. Note that the index
  // here will be offset by the maximum number of entries in the circuit itself.
  const tupleMap = new Map();
  if (config.tuples !== undefined) {
    const maxVirtualEntries = paramMaxVirtualEntries(circuitDesc);
    let tupleIndex = circuitDesc.maxEntries + maxVirtualEntries;
    const tupleNameOrder: PODName[] = Object.keys(
      config.tuples
    ).sort() as PODName[];
    for (const tupleName of tupleNameOrder) {
      const tupleConfig = config.tuples[tupleName];
      if (tupleConfig === undefined) {
        throw new Error(`Missing config for tuple ${tupleName}.`);
      }

      if (tupleConfig.entries.length < 2) {
        throw new Error(`Arity of tuple ${tupleName} is less than 2.`);
      }

      const tupleEntryRef: number[] = tupleConfig.entries.map((entryId) => {
        const entryIdx = entryMap.get(entryId)?.entryIndex;

        if (entryIdx === undefined) {
          throw new ReferenceError(
            `Missing entry index for identifier ${entryId} in tuple ${tupleName}.`
          );
        }

        return entryIdx;
      });

      // Encode tuple as sequence of tuples of arity circuitDesc.tupleArity
      const tupleIndices = computeTupleIndices(
        circuitDesc.tupleArity,
        tupleIndex,
        tupleEntryRef
      );

      tupleIndex += tupleIndices.length;

      tupleMap.set(`${TUPLE_PREFIX}.${tupleName}`, {
        tupleIndex: tupleIndex - 1,
        tupleInputIndices: tupleIndices
      });
    }

    const numTuples = tupleIndex - (circuitDesc.maxEntries + maxVirtualEntries);
    if (numTuples > circuitDesc.maxTuples) {
      throw new Error(
        `GPC configuration requires ${numTuples} tuples but the chosen circuit only supports ${circuitDesc.maxTuples}.`
      );
    }
  }
  return tupleMap;
}

/**
 * Converts a high-level description of a GPC proof to be generated into
 * the specific circuit signals needed to generate the proof with a specific
 * circuit.
 *
 * This code assumes that the arguments have already been checked to be
 * well-formed represent a valid proof configuration using
 * {@link checkProofArgs}, and that the selected circuit fits the requirements
 * of the proof using {@link checkCircuitParameters}.  Any invalid input might
 * result in errors thrown from TypeScript, or might simply result in a failure
 * to generate a proof.
 *
 * @param proofConfig the configuration for the proof
 * @param proofInputs the inputs for the proof
 * @param circuitDesc the description of the specific circuit to use for
 *   the proof.
 * @returns circuit input signals for proof generation
 */
export function compileProofConfig(
  proofConfig: GPCBoundConfig,
  proofInputs: GPCProofInputs,
  circuitDesc: ProtoPODGPCCircuitDesc
): ProtoPODGPCInputs {
  // Put the objects and entries in order, in maps for easy lookups.
  const { objMap, entryMap } = prepCompilerMaps<GPCProofInputs, POD>(
    circuitDesc,
    proofConfig,
    proofInputs
  );

  // Do the same for tuples (if any).
  const tupleMap = prepCompilerTupleMap(proofConfig, entryMap, circuitDesc);

  // Create subset of inputs for object modules, padded to max size.
  const circuitObjInputs = combineProofObjects(
    Array.from(objMap.values()).map(compileProofObject),
    circuitDesc.maxObjects
  );

  // Create subset of inputs for entry modules, padded to max size.
  const circuitEntryInputs = combineProofEntries(
    Array.from(entryMap.entries())
      .filter(
        ([entryIdentifier, _]) => !isVirtualEntryIdentifier(entryIdentifier)
      )
      .map(([_, e]) => compileProofEntry(e, circuitDesc.merkleMaxDepth)),
    circuitDesc.maxEntries
  );

  // Create subset of inputs for entry comparisons and ownership, which share
  // some of the same circuitry.
  const { circuitEntryConstraintInputs, entryConstraintMetadata } =
    compileProofEntryConstraints(
      entryMap,
      circuitDesc.maxEntries,
      paramMaxVirtualEntries(circuitDesc)
    );

  // Create subset of inputs for owner module.
  const circuitOwnerInputs = compileProofOwner(
    proofInputs.owner,
    entryConstraintMetadata.firstOwnerIndex
  );

  // Create bounds check inputs
  // TODO(POD-P2): Replace this with actual inputs.
  const circuitBoundsCheckInputs = dummyBoundsCheckInputs(circuitDesc);

  // Create subset of inputs for multituple module padded to max size.
  const circuitMultiTupleInputs = compileProofMultiTuples(
    tupleMap,
    circuitDesc.maxTuples,
    circuitDesc.tupleArity
  );

  // Create subset of inputs for list membership module padded to max size.
  const listConfig = listConfigFromProofConfig(proofConfig);
  const circuitListMembershipInputs = compileProofListMembership(
    listConfig,
    proofInputs.membershipLists ?? {},
    entryMap,
    tupleMap,
    circuitDesc.tupleArity,
    circuitDesc.maxLists,
    circuitDesc.maxListElements
  );

  // Create other global inputs.
  const circuitGlobalInputs = compileProofGlobal(proofInputs);

  // Virtual entry inputs
  const circuitVirtualEntryInputs = compileProofVirtualEntry(
    circuitDesc,
    objMap,
    entryMap
  );

  // Return all the resulting signals input to the gpcircuits library.
  // The specific return type of each compile phase above lets the TS compiler
  // confirm that all expected fields have been set with the right types (though
  // not their array sizes).
  return {
    ...circuitObjInputs,
    ...circuitEntryInputs,
    ...circuitVirtualEntryInputs,
    ...circuitEntryConstraintInputs,
    ...circuitOwnerInputs,
    ...circuitBoundsCheckInputs,
    ...circuitMultiTupleInputs,
    ...circuitListMembershipInputs,
    ...circuitGlobalInputs
  };
}

function compileProofObject(objInfo: CompilerObjInfo<POD>): ObjectModuleInputs {
  if (objInfo.objInput === undefined) {
    throw new Error(`Object input for object ${objInfo.objName} is undefined.`);
  }

  const publicKey = decodePublicKey(objInfo.objInput.signerPublicKey);
  const signature = decodeSignature(objInfo.objInput.signature);

  return {
    contentID: objInfo.objInput.contentID,
    signerPubkeyAx: publicKey[0],
    signerPubkeyAy: publicKey[1],
    signatureR8x: signature.R8[0],
    signatureR8y: signature.R8[1],
    signatureS: signature.S
  };
}

function compileProofListMembership<
  ObjInput extends POD | GPCRevealedObjectClaims
>(
  listConfig: GPCProofMembershipListConfig,
  listInput: Record<PODName, PODValue[] | PODValueTuple[]>,
  entryMap: Map<PODEntryIdentifier, CompilerEntryInfo<ObjInput>>,
  tupleMap: Map<TupleIdentifier, CompilerTupleInfo>,
  paramTupleArity: number,
  paramMaxLists: number,
  paramMaxListElements: number
): {
  listComparisonValueIndex: CircuitSignal[];
  listContainsComparisonValue: CircuitSignal;
  listValidValues: CircuitSignal[][];
} {
  // Arrange list element identifiers alphabetically.
  const listElementIdOrder = (
    Object.keys(listConfig) as (PODEntryIdentifier | TupleIdentifier)[]
  ).sort();

  // Compile listComparisonValueIndex
  const unpaddedListComparisonValueIndex = listElementIdOrder.map(
    (elementId) => {
      const idx = isTupleIdentifier(elementId)
        ? tupleMap.get(elementId as TupleIdentifier)?.tupleIndex
        : entryMap.get(elementId)?.entryIndex;

      if (idx === undefined) {
        throw new Error(`Missing input for identifier ${elementId}.`);
      }

      return BigInt(idx);
    }
  );

  // Compile listContainsComparisonValue
  const unpaddedListContainsComparisonValue = listElementIdOrder.map(
    (elementId) => (listConfig[elementId].type === LIST_MEMBERSHIP ? 1n : 0n)
  );

  // Compile listValidValues, making sure to sort the hashed values before
  // padding.
  const unpaddedListValidValues = listElementIdOrder.map((elementId) => {
    const idListConfig = listConfig[elementId];

    // Resolve lists
    const list = listInput[idListConfig.listIdentifier];

    // Hash list and sort
    const hashedList = (
      isTupleIdentifier(elementId)
        ? (list as PODValueTuple[]).map((element) =>
            hashTuple(paramTupleArity, element)
          )
        : (list as PODValue[]).map(podValueHash)
    ).sort();

    // Pad the list to its capacity by using the first element of the list, which
    // is OK because the list is really a set. This also avoids false positives.
    return padArray(hashedList, paramMaxListElements, hashedList[0]);
  });

  return {
    // Pad with index -1 (mod p), which is a reference to the value 0.
    listComparisonValueIndex: padArray(
      unpaddedListComparisonValueIndex,
      paramMaxLists,
      BABY_JUB_NEGATIVE_ONE
    ),
    // Pad with 1s, which amounts to a list membership check for those values
    // corresponding to index -1 (which corresponds to the value 0), cf. the
    // `listComparisonValueIndex` padding.
    listContainsComparisonValue: array2Bits(
      padArray(unpaddedListContainsComparisonValue, paramMaxLists, 1n)
    ),
    // Pad with lists of 0s, which amounts to trivially satisfied list
    // membership checks for those indices used as padding just above.
    listValidValues: padArray(
      unpaddedListValidValues,
      paramMaxLists,
      padArray([], paramMaxListElements, 0n)
    )
  };
}

function compileProofMultiTuples(
  tupleMap: Map<TupleIdentifier, CompilerTupleInfo>,
  paramMaxTuples: number,
  paramTupleArity: number
): { tupleIndices: CircuitSignal[][] } {
  // Concatenate `tupleIndices` field of all tuple map values together and convert
  // the indices to bigints.
  const unpaddedTupleIndices = Array.from(tupleMap.values())
    .flatMap((info) => info.tupleInputIndices)
    .map((tuple) => tuple.map((n) => BigInt(n)));

  return {
    // Pad the result to length `paramMaxTuples` with tuples of 0s, which
    // corresponds to choosing the 0th entry value hash. Since these are not
    // constrained anywhere, there is no effect on the underlying logic.
    tupleIndices: padArray(
      unpaddedTupleIndices,
      paramMaxTuples,
      padArray([], paramTupleArity, 0n)
    )
  };
}

function combineProofObjects(
  allObjInputs: ObjectModuleInputs[],
  maxObjects: number
): {
  objectContentID: CircuitSignal /*MAX_OBJECTS*/[];
  objectSignerPubkeyAx: CircuitSignal /*MAX_OBJECTS*/[];
  objectSignerPubkeyAy: CircuitSignal /*MAX_OBJECTS*/[];
  objectSignatureR8x: CircuitSignal /*MAX_OBJECTS*/[];
  objectSignatureR8y: CircuitSignal /*MAX_OBJECTS*/[];
  objectSignatureS: CircuitSignal /*MAX_OBJECTS*/[];
} {
  // Object modules don't have an explicit disabled state, so spare object
  // slots get filled in with copies of Object 0.
  for (let objIndex = allObjInputs.length; objIndex < maxObjects; objIndex++) {
    allObjInputs.push({ ...allObjInputs[0] });
  }

  return {
    objectContentID: allObjInputs.map((o) => o.contentID),
    objectSignerPubkeyAx: allObjInputs.map((o) => o.signerPubkeyAx),
    objectSignerPubkeyAy: allObjInputs.map((o) => o.signerPubkeyAy),
    objectSignatureR8x: allObjInputs.map((o) => o.signatureR8x),
    objectSignatureR8y: allObjInputs.map((o) => o.signatureR8y),
    objectSignatureS: allObjInputs.map((o) => o.signatureS)
  };
}

// Reusing EntryModuleInputs is a convenient way to not miss any fields, but
// there are some differences in the GPC-level inputs vs. the per-module inputs.
type EntryModuleCompilerInputs = Omit<EntryModuleInputs, "objectContentID"> & {
  objectIndex: bigint;
};

function compileProofEntry(
  entryInfo: CompilerEntryInfo<POD>,
  merkleMaxDepth: number
): EntryModuleCompilerInputs {
  if (entryInfo.objInput === undefined) {
    throw new Error(
      `Object input for object ${entryInfo.objName} is undefined.`
    );
  }

  const entrySignals = entryInfo.objInput.content.generateEntryCircuitSignals(
    entryInfo.entryName
  );

  // Plaintext value is only enabled if it is needed by some other
  // configured constraint, which for now is only the owner commitment.
  const isValueEnabled = !!entryInfo.entryConfig.isOwnerID;
  let entryValue = BABY_JUB_NEGATIVE_ONE;
  if (isValueEnabled) {
    if (entrySignals.value === undefined) {
      throw new Error("Numeric entry value is unavailable when required.");
    }
    entryValue = entrySignals.value;
  }

  return {
    objectIndex: BigInt(entryInfo.objIndex),
    nameHash: entrySignals.nameHash,
    isValueHashRevealed: entryInfo.entryConfig.isRevealed ? 1n : 0n,
    proofDepth: BigInt(entrySignals.proof.siblings.length),
    proofIndex: BigInt(entrySignals.proof.index),
    proofSiblings: extendedSignalArray(
      entrySignals.proof.siblings,
      merkleMaxDepth
    ),
    value: entryValue,
    isValueEnabled: isValueEnabled ? 1n : 0n
  };
}

function compileProofVirtualEntry<
  ObjInput extends POD | GPCRevealedObjectClaims
>(
  circuitDesc: ProtoPODGPCCircuitDesc,
  objMap: Map<PODName, CompilerObjInfo<ObjInput>>,
  entryMap: Map<PODEntryIdentifier, CompilerEntryInfo<ObjInput>>
): {
  virtualEntryIsValueHashRevealed: CircuitSignal;
} {
  const objNames = Array.from(objMap.keys());
  const unpaddedVirtualEntryIsValueHashRevealed = objNames.map((objName) => {
    const entryInfo = entryMap.get(`${objName}.$signerPublicKey`);
    if (entryInfo === undefined) {
      throw new Error(
        `Entry ${objName}.$signerPublicKey is missing from entry map.`
      );
    }
    const isPublicKeyRevealed = entryInfo.entryConfig.isRevealed;
    return BigInt(+isPublicKeyRevealed);
  });

  return {
    virtualEntryIsValueHashRevealed: array2Bits(
      padArray(
        unpaddedVirtualEntryIsValueHashRevealed,
        circuitDesc.maxObjects,
        0n
      )
    )
  };
}

function combineProofEntries(
  allEntryInputs: EntryModuleCompilerInputs[],
  maxEntries: number
): {
  entryObjectIndex: CircuitSignal /*MAX_ENTRIES*/[];
  entryNameHash: CircuitSignal /*MAX_ENTRIES*/[];
  entryValue: CircuitSignal /*MAX_ENTRIES*/[];
  entryIsValueEnabled: CircuitSignal /*MAX_ENTRIES packed bits*/;
  entryIsValueHashRevealed: CircuitSignal /*MAX_ENTRIES packed bits*/;
  entryProofDepth: CircuitSignal /*MAX_ENTRIES*/[];
  entryProofIndex: CircuitSignal /*MAX_ENTRIES*/[] /*MERKLE_MAX_DEPTH packed bits*/;
  entryProofSiblings: CircuitSignal /*MAX_ENTRIES*/[] /*MERKLE_MAX_DEPTH*/[];
} {
  // Entry modules don't have an explicit disabled state, so spare entry slots
  // are filled with the name of Entry 0, value disabled.
  for (
    let entryIndex = allEntryInputs.length;
    entryIndex < maxEntries;
    entryIndex++
  ) {
    allEntryInputs.push({
      objectIndex: allEntryInputs[0].objectIndex,
      nameHash: allEntryInputs[0].nameHash,
      isValueHashRevealed: 0n,
      proofDepth: allEntryInputs[0].proofDepth,
      proofIndex: allEntryInputs[0].proofIndex,
      proofSiblings: [...allEntryInputs[0].proofSiblings],
      value: 0n,
      isValueEnabled: 0n
    });
  }

  // Combine indidvidual arrays to form the circuit inputs, as 1D arrays, 2D
  // arrays, or bitfields as appropriate.
  return {
    // ContentID holding index is a lie, but it allows reusing the inputs type.
    entryObjectIndex: allEntryInputs.map((e) => e.objectIndex),
    entryNameHash: allEntryInputs.map((e) => e.nameHash),
    entryValue: allEntryInputs.map((e) => e.value),
    entryIsValueEnabled: array2Bits(
      allEntryInputs.map((e) => e.isValueEnabled)
    ),
    entryIsValueHashRevealed: array2Bits(
      allEntryInputs.map((e) => e.isValueHashRevealed)
    ),
    entryProofDepth: allEntryInputs.map((e) => e.proofDepth),
    entryProofIndex: allEntryInputs.map((e) => e.proofIndex),
    entryProofSiblings: allEntryInputs.map((e) => e.proofSiblings)
  };
}

function compileProofEntryConstraints(
  entryMap: Map<PODEntryIdentifier, CompilerEntryInfo<unknown>>,
  maxEntries: number,
  maxVirtualEntries: number
): {
  circuitEntryConstraintInputs: {
    entryEqualToOtherEntryByIndex: CircuitSignal[];
  };
  entryConstraintMetadata: {
    firstOwnerIndex: number;
  };
} {
  // Deal with equality comparision and POD ownership, which share circuitry.
  let firstOwnerIndex = 0;
  const entryEqualToOtherEntryByIndex: bigint[] = [];
  const virtualEntryEqualToOtherEntryByIndex: bigint[] = [];

  for (const entryInfo of entryMap.values()) {
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
      entryEqualToOtherEntryByIndex.push(BigInt(firstOwnerIndex));
    } else if (entryInfo.entryConfig.equalsEntry !== undefined) {
      const otherEntryInfo = entryMap.get(entryInfo.entryConfig.equalsEntry);
      if (otherEntryInfo === undefined) {
        throw new Error(
          `Missing entry ${entryInfo.entryConfig.equalsEntry} for equality comparison.`
        );
      }
      (isVirtualEntryName(entryInfo.entryName)
        ? virtualEntryEqualToOtherEntryByIndex
        : entryEqualToOtherEntryByIndex
      ).push(BigInt(otherEntryInfo.entryIndex));
    } else {
      (isVirtualEntryName(entryInfo.entryName)
        ? virtualEntryEqualToOtherEntryByIndex
        : entryEqualToOtherEntryByIndex
      ).push(BigInt(entryInfo.entryIndex));
    }
  }

  // Equality constraints don't have an explicit disabled state, so spare
  // entry slots always compare to themselves, to be a nop.
  for (
    let entryIndex = entryEqualToOtherEntryByIndex.length;
    entryIndex < maxEntries;
    entryIndex++
  ) {
    entryEqualToOtherEntryByIndex.push(BigInt(entryIndex));
  }
  for (
    let entryIndex = virtualEntryEqualToOtherEntryByIndex.length;
    entryIndex < maxVirtualEntries;
    entryIndex++
  ) {
    virtualEntryEqualToOtherEntryByIndex.push(BigInt(maxEntries + entryIndex));
  }

  return {
    circuitEntryConstraintInputs: {
      entryEqualToOtherEntryByIndex: entryEqualToOtherEntryByIndex.concat(
        virtualEntryEqualToOtherEntryByIndex
      )
    },
    entryConstraintMetadata: { firstOwnerIndex }
  };
}

function compileProofOwner(
  ownerInput: GPCProofOwnerInputs | undefined,
  firstOwnerIndex: number
): {
  ownerEntryIndex: CircuitSignal;
  ownerSemaphoreV3IdentityNullifier: CircuitSignal;
  ownerSemaphoreV3IdentityTrapdoor: CircuitSignal;
  ownerExternalNullifier: CircuitSignal;
  ownerIsNullfierHashRevealed: CircuitSignal;
} {
  // Owner module is enabled if any entry config declared it was an owner
  // commitment.  It can't be enabled purely for purpose of nullifier hash,
  // since an unconstrained owner could be set to any random numbers.
  const hasOwner = firstOwnerIndex !== 0;
  if (hasOwner && ownerInput?.semaphoreV3 === undefined) {
    throw new Error("Missing owner identity.");
  }

  return {
    ownerEntryIndex: hasOwner ? BigInt(firstOwnerIndex) : BABY_JUB_NEGATIVE_ONE,
    ownerSemaphoreV3IdentityNullifier:
      hasOwner && ownerInput?.semaphoreV3.nullifier !== undefined
        ? ownerInput.semaphoreV3.nullifier
        : BABY_JUB_NEGATIVE_ONE,
    ownerSemaphoreV3IdentityTrapdoor:
      hasOwner && ownerInput?.semaphoreV3?.nullifier !== undefined
        ? ownerInput.semaphoreV3.trapdoor
        : BABY_JUB_NEGATIVE_ONE,
    ownerExternalNullifier: makeWatermarkSignal(ownerInput?.externalNullifier),
    ownerIsNullfierHashRevealed:
      ownerInput?.externalNullifier !== undefined ? 1n : 0n
  };
}

function compileProofGlobal(proofInputs: GPCProofInputs | GPCRevealedClaims): {
  globalWatermark: CircuitSignal;
} {
  return {
    globalWatermark: makeWatermarkSignal(proofInputs.watermark)
  };
}

/**
 * Converts a high-level description of a GPC proof already generated into
 * the specific circuit signals needed to verify the proof with a specific
 * circuit.
 *
 * This code assumes that the arguments have already been checked using {@link
 * checkVerifyArgs}, and their requirements have already been checked using
 * {@link checkCircuitParameters}.  This function doesn't duplicate any
 * checking, so invalid input might result in errors thrown from TypeScript,
 * or might simply result in a failure to verify a proof.
 *
 * @param verifyConfig the configuration for the proof
 * @param verifyRevealed the revealed inputs and outputs from the proof
 * @param circuitDesc the description of the specific circuit to use for
 *   the proof.
 * @returns circuit public input and output signals which match what was
 *   produced at proving time
 */
export function compileVerifyConfig(
  verifyConfig: GPCBoundConfig,
  verifyRevealed: GPCRevealedClaims,
  circuitDesc: ProtoPODGPCCircuitDesc
): {
  circuitPublicInputs: ProtoPODGPCPublicInputs;
  circuitOutputs: ProtoPODGPCOutputs;
} {
  // Put the objects and entries in order, in maps for easy lookups.
  const { objMap, entryMap } = prepCompilerMaps<
    GPCRevealedClaims,
    GPCRevealedObjectClaims
  >(circuitDesc, verifyConfig, verifyRevealed);

  // Do the same for tuples (if any).
  const tupleMap = prepCompilerTupleMap(verifyConfig, entryMap, circuitDesc);

  // Create subset of inputs and outputs for entry modules, padded to max size.
  const { circuitEntryInputs, circuitEntryOutputs } = combineVerifyEntries(
    Array.from(entryMap.entries())
      .filter(
        ([entryIdentifier, _]) => !isVirtualEntryIdentifier(entryIdentifier)
      )
      .map(([_, e]) => compileVerifyEntry(e)),
    circuitDesc.maxEntries
  );

  // Create subset of inputs for entry comparisons and ownership, which share
  // some of the same circuitry.  This logic is shared with compileProofConfig,
  // since all the signals involved are public.
  const { circuitEntryConstraintInputs, entryConstraintMetadata } =
    compileProofEntryConstraints(
      entryMap,
      circuitDesc.maxEntries,
      paramMaxVirtualEntries(circuitDesc)
    );

  // Create subset of inputs and outputs for owner module.
  const { circuitOwnerInputs, circuitOwnerOutputs } = compileVerifyOwner(
    verifyRevealed.owner,
    entryConstraintMetadata.firstOwnerIndex
  );

  // Create bounds check inputs
  // TODO(POD-P2): Replace this with actual inputs.
  const circuitBoundsCheckInputs = dummyBoundsCheckInputs(circuitDesc);

  // Create subset of inputs for multituple module padded to max size.
  const circuitMultiTupleInputs = compileProofMultiTuples(
    tupleMap,
    circuitDesc.maxTuples,
    circuitDesc.tupleArity
  );

  // Create subset of inputs for list membership module padded to max size.
  const listConfig = listConfigFromProofConfig(verifyConfig);
  const circuitListMembershipInputs = compileProofListMembership(
    listConfig,
    verifyRevealed.membershipLists ?? {},
    entryMap,
    tupleMap,
    circuitDesc.tupleArity,
    circuitDesc.maxLists,
    circuitDesc.maxListElements
  );

  // Create other global inputs.  Logic shared with compileProofConfig,
  // since all the signals involved are public.
  const circuitGlobalInputs = compileProofGlobal(verifyRevealed);

  // Virtual entry inputs
  const circuitVirtualEntryInputs = compileProofVirtualEntry(
    circuitDesc,
    objMap,
    entryMap
  );

  // Virtual entry outputs
  const circuitVirtualEntryOutputs = compileVerifyVirtualEntry(
    circuitDesc,
    objMap,
    entryMap
  );

  // Return all the resulting signals input to the gpcircuits library.
  // The specific return type of each compile phase above lets the TS compiler
  // confirm that all expected fields have been set with the right types (though
  // not their array sizes).
  return {
    circuitPublicInputs: {
      ...circuitEntryInputs,
      ...circuitVirtualEntryInputs,
      ...circuitEntryConstraintInputs,
      ...circuitOwnerInputs,
      ...circuitBoundsCheckInputs,
      ...circuitMultiTupleInputs,
      ...circuitListMembershipInputs,
      ...circuitGlobalInputs
    },
    circuitOutputs: {
      ...circuitEntryOutputs,
      ...circuitVirtualEntryOutputs,
      ...circuitOwnerOutputs
    }
  };
}

type CompilerVerifyEntryInputs = {
  objectIndex: CircuitSignal;
  nameHash: CircuitSignal;
  isValueEnabled: CircuitSignal;
  isValueHashRevealed: CircuitSignal;
};

type CompilerVerifyEntryOutputs = {
  revealedValueHash: CircuitSignal;
};

function compileVerifyEntry(
  entryInfo: CompilerEntryInfo<GPCRevealedObjectClaims>
): { inputs: CompilerVerifyEntryInputs; outputs: CompilerVerifyEntryOutputs } {
  // Plaintext value is only enabled if it is needed by some other
  // configured constraint, which for now is only the owner commitment.
  const isValueEnabled = !!entryInfo.entryConfig.isOwnerID;

  // Fetch the entry value, if it's configured to be revealed.
  let revealedEntryValue: PODValue | undefined = undefined;
  if (entryInfo.entryConfig.isRevealed) {
    if (entryInfo.objInput?.entries === undefined) {
      throw new Error("Missing revealed entries.");
    }
    revealedEntryValue = entryInfo.objInput.entries[entryInfo.entryName];
    if (revealedEntryValue === undefined) {
      throw new Error(
        `Missing revealed entry ${entryInfo.objName}.${entryInfo.entryName}.`
      );
    }
  }

  return {
    inputs: {
      objectIndex: BigInt(entryInfo.objIndex),
      nameHash: podNameHash(entryInfo.entryName),
      isValueEnabled: isValueEnabled ? 1n : 0n,
      isValueHashRevealed: entryInfo.entryConfig.isRevealed ? 1n : 0n
    },
    outputs: {
      revealedValueHash:
        revealedEntryValue !== undefined
          ? podValueHash(revealedEntryValue)
          : BABY_JUB_NEGATIVE_ONE
    }
  };
}

function combineVerifyEntries(
  allEntryInputsOutputs: {
    inputs: CompilerVerifyEntryInputs;
    outputs: CompilerVerifyEntryOutputs;
  }[],
  maxEntries: number
): {
  circuitEntryInputs: {
    entryObjectIndex: CircuitSignal[];
    entryNameHash: CircuitSignal[];
    entryIsValueEnabled: CircuitSignal;
    entryIsValueHashRevealed: CircuitSignal;
  };
  circuitEntryOutputs: {
    entryRevealedValueHash: CircuitSignal[];
  };
} {
  // Spare entry slots are filled with the name of Entry 0, value disabled.
  for (
    let entryIndex = allEntryInputsOutputs.length;
    entryIndex < maxEntries;
    entryIndex++
  ) {
    allEntryInputsOutputs.push({
      inputs: {
        objectIndex: allEntryInputsOutputs[0].inputs.objectIndex,
        nameHash: allEntryInputsOutputs[0].inputs.nameHash,
        isValueEnabled: 0n,
        isValueHashRevealed: 0n
      },
      outputs: {
        revealedValueHash: BABY_JUB_NEGATIVE_ONE
      }
    });
  }

  // Combine indidvidual arrays to form the circuit inputs, as 1D arrays, 2D
  // arrays, or bitfields as appropriate.
  return {
    circuitEntryInputs: {
      entryObjectIndex: allEntryInputsOutputs.map(
        (io) => io.inputs.objectIndex
      ),
      entryNameHash: allEntryInputsOutputs.map((io) => io.inputs.nameHash),
      entryIsValueEnabled: array2Bits(
        allEntryInputsOutputs.map((io) => io.inputs.isValueEnabled)
      ),
      entryIsValueHashRevealed: array2Bits(
        allEntryInputsOutputs.map((io) => io.inputs.isValueHashRevealed)
      )
    },
    circuitEntryOutputs: {
      entryRevealedValueHash: allEntryInputsOutputs.map(
        (io) => io.outputs.revealedValueHash
      )
    }
  };
}

function compileVerifyVirtualEntry(
  circuitDesc: ProtoPODGPCCircuitDesc,
  objMap: Map<PODName, CompilerObjInfo<GPCRevealedObjectClaims>>,
  entryMap: Map<PODEntryIdentifier, CompilerEntryInfo<GPCRevealedObjectClaims>>
): {
  virtualEntryRevealedValueHash: CircuitSignal[];
} {
  const objNames = Array.from(objMap.keys());

  const unpaddedVirtualEntryRevealedValueHash = objNames.map((objName) => {
    const entryInfo = entryMap.get(`${objName}.$signerPublicKey`);
    if (entryInfo === undefined) {
      throw new Error(
        `Entry ${objName}.$signerPublicKey is missing from entry map.`
      );
    }
    const maybePublicKeyString = entryInfo.objInput?.signerPublicKey;
    return maybePublicKeyString !== undefined
      ? podValueHash(PODEdDSAPublicKeyValue(maybePublicKeyString))
      : BABY_JUB_NEGATIVE_ONE;
  });

  return {
    virtualEntryRevealedValueHash: padArray(
      unpaddedVirtualEntryRevealedValueHash,
      circuitDesc.maxObjects,
      BABY_JUB_NEGATIVE_ONE
    )
  };
}

function compileVerifyOwner(
  ownerInput: GPCRevealedOwnerClaims | undefined,
  firstOwnerIndex: number
): {
  circuitOwnerInputs: {
    ownerEntryIndex: CircuitSignal;
    ownerExternalNullifier: CircuitSignal;
    ownerIsNullfierHashRevealed: CircuitSignal;
  };
  circuitOwnerOutputs: {
    ownerRevealedNullifierHash: CircuitSignal;
  };
} {
  // Owner module is enabled if any entry config declared it was an owner
  // commitment.  It can't be enabled purely for purpose of nullifier hash,
  // since an unconstrained owner could be set to any random numbers.
  const hasOwner = firstOwnerIndex !== 0;

  return {
    circuitOwnerInputs: {
      ownerEntryIndex: hasOwner
        ? BigInt(firstOwnerIndex)
        : BABY_JUB_NEGATIVE_ONE,
      ownerExternalNullifier: makeWatermarkSignal(
        ownerInput?.externalNullifier
      ),
      ownerIsNullfierHashRevealed:
        ownerInput?.externalNullifier !== undefined ? 1n : 0n
    },
    circuitOwnerOutputs: {
      ownerRevealedNullifierHash:
        ownerInput?.nullifierHash ?? BABY_JUB_NEGATIVE_ONE
    }
  };
}

/**
 * Creates a high-level description of the public claims of a proof, by
 * redacting information from the proof's inputs and outputs.
 *
 * This code assumes that the arguments have already been checked using {@link
 * checkProofArgs}, and their requirements have already been checked using
 * {@link checkCircuitParameters}.  This function doesn't duplicate any
 * checking, so invalid input might result in errors thrown from TypeScript,
 * or might simply result in a failure to generate a proof.
 *
 * @param proofConfig the configuration of the proof
 * @param proofInputs the inputs to the proof
 * @param circuitOutputs the outputs of the proof circuit
 * @returns a redacted view of inputs and outputs
 */
export function makeRevealedClaims(
  proofConfig: GPCBoundConfig,
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
    // Unless specified otherwise, reveal signer's public key by default.
    let revealedSignerPublicKey = true;
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
    if (objConfig.signerPublicKey?.isRevealed !== undefined) {
      revealedSignerPublicKey = objConfig.signerPublicKey.isRevealed;
    }
    if (anyRevealedEntries || revealedSignerPublicKey) {
      revealedObjects[objName] = {
        ...(anyRevealedEntries ? { entries: revealedEntries } : {}),
        ...(revealedSignerPublicKey
          ? { signerPublicKey: pod.signerPublicKey }
          : {})
      };
    }
  }

  return {
    pods: revealedObjects,
    ...(proofInputs.owner?.externalNullifier !== undefined
      ? {
          owner: {
            externalNullifier: proofInputs.owner.externalNullifier,
            nullifierHash: BigInt(circuitOutputs.ownerRevealedNullifierHash)
          }
        }
      : {}),
    ...(proofInputs.membershipLists !== undefined
      ? { membershipLists: proofInputs.membershipLists }
      : {}),
    ...(proofInputs.watermark !== undefined
      ? { watermark: proofInputs.watermark }
      : {})
  };
}
