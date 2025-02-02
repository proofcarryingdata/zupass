// This file is the source of truth for GPC test circuit configurations.
//
// Run `yarn gen-circuit-parameters test && yarn gen-artifacts test` after
// editing.
import { ProtoPODGPCCircuitParams } from "../../src";

export const PARAMS: ProtoPODGPCCircuitParams[] = [
  {
    maxObjects: 1,
    maxEntries: 1,
    merkleMaxDepth: 5,
    maxNumericValues: 0,
    maxEntryInequalities: 0,
    maxLists: 0,
    maxListElements: 0,
    maxTuples: 0,
    tupleArity: 0,
    includeOwnerV3: true,
    includeOwnerV4: false
  },
  {
    maxObjects: 1,
    maxEntries: 5,
    merkleMaxDepth: 6,
    maxNumericValues: 2,
    maxEntryInequalities: 0,
    maxLists: 0,
    maxListElements: 0,
    maxTuples: 0,
    tupleArity: 0,
    includeOwnerV3: true,
    includeOwnerV4: true
  },
  {
    maxObjects: 1,
    maxEntries: 5,
    merkleMaxDepth: 5,
    maxNumericValues: 0,
    maxEntryInequalities: 0,
    maxLists: 1,
    maxListElements: 200,
    maxTuples: 1,
    tupleArity: 3,
    includeOwnerV3: false,
    includeOwnerV4: true
  },
  {
    maxObjects: 1,
    maxEntries: 11,
    merkleMaxDepth: 5,
    maxNumericValues: 0,
    maxEntryInequalities: 0,
    maxLists: 1,
    maxListElements: 200,
    maxTuples: 1,
    tupleArity: 3,
    includeOwnerV3: false,
    includeOwnerV4: true
  },
  {
    maxObjects: 3,
    maxEntries: 10,
    merkleMaxDepth: 8,
    maxNumericValues: 4,
    maxEntryInequalities: 2,
    maxLists: 2,
    maxListElements: 20,
    maxTuples: 2,
    tupleArity: 2,
    includeOwnerV3: false,
    includeOwnerV4: true
  },
  {
    maxObjects: 3,
    maxEntries: 10,
    merkleMaxDepth: 8,
    maxNumericValues: 4,
    maxEntryInequalities: 2,
    maxLists: 4,
    maxListElements: 20,
    maxTuples: 5,
    tupleArity: 3,
    includeOwnerV3: true,
    includeOwnerV4: true
  }
];
