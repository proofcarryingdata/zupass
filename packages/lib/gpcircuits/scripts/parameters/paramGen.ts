// This file is the source of truth for GPC production circuit configurations.
//
// Run `yarn gen-circuit-parameters && yarn gen-artifacts` after editing.
import { ProtoPODGPCCircuitParams } from "../../src";

// Circuit parameters are grouped by numbers of objects and arranged in
// ascending order wrt. number of entries.
export const PARAMS: ProtoPODGPCCircuitParams[] = [
  /*
   * 1 object
   */
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
    maxEntries: 1,
    merkleMaxDepth: 5,
    maxNumericValues: 0,
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
    maxEntries: 10,
    merkleMaxDepth: 5,
    maxNumericValues: 0,
    maxEntryInequalities: 0,
    maxLists: 1,
    maxListElements: 0,
    maxTuples: 0,
    tupleArity: 0,
    includeOwnerV3: false,
    includeOwnerV4: true
  },
  // Minimal POD ticket configuration.
  {
    maxObjects: 1,
    maxEntries: 11,
    merkleMaxDepth: 5,
    maxNumericValues: 0,
    maxEntryInequalities: 0,
    maxLists: 0,
    maxListElements: 0,
    maxTuples: 0,
    tupleArity: 0,
    includeOwnerV3: false,
    includeOwnerV4: true
  },
  // Smaller POD ticket configuration including tuple and list membership check.
  {
    maxObjects: 1,
    maxEntries: 11,
    merkleMaxDepth: 5,
    maxNumericValues: 0,
    maxEntryInequalities: 0,
    maxLists: 1,
    maxListElements: 50,
    maxTuples: 1,
    tupleArity: 3,
    includeOwnerV3: false,
    includeOwnerV4: true
  },
  // Bigger POD ticket configuration including tuple and list membership check.
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
    maxObjects: 1,
    maxEntries: 20,
    merkleMaxDepth: 6,
    maxNumericValues: 0,
    maxEntryInequalities: 0,
    maxLists: 1,
    maxListElements: 0,
    maxTuples: 0,
    tupleArity: 0,
    includeOwnerV3: false,
    includeOwnerV4: true
  },
  {
    maxObjects: 1,
    maxEntries: 20,
    merkleMaxDepth: 6,
    maxNumericValues: 20,
    maxEntryInequalities: 20,
    maxLists: 5,
    maxListElements: 500,
    maxTuples: 0,
    tupleArity: 0,
    includeOwnerV3: false,
    includeOwnerV4: true
  },
  // Even bigger POD ticket configuration including more entries.
  {
    maxObjects: 1,
    maxEntries: 23,
    merkleMaxDepth: 6,
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
    maxEntries: 30,
    merkleMaxDepth: 6,
    maxNumericValues: 0,
    maxEntryInequalities: 0,
    maxLists: 0,
    maxListElements: 0,
    maxTuples: 0,
    tupleArity: 0,
    includeOwnerV3: false,
    includeOwnerV4: true
  },
  {
    maxObjects: 1,
    maxEntries: 38,
    merkleMaxDepth: 7,
    maxNumericValues: 38,
    maxEntryInequalities: 19,
    maxLists: 0,
    maxListElements: 0,
    maxTuples: 0,
    tupleArity: 0,
    includeOwnerV3: false,
    includeOwnerV4: true
  },
  // Kitchen sink config
  {
    maxObjects: 1,
    maxEntries: 40,
    merkleMaxDepth: 7,
    maxNumericValues: 38,
    maxEntryInequalities: 19,
    maxLists: 0,
    maxListElements: 0,
    maxTuples: 0,
    tupleArity: 0,
    includeOwnerV3: false,
    includeOwnerV4: true
  },
  /*
   * 2 objects
   */
  {
    maxObjects: 2,
    maxEntries: 5,
    merkleMaxDepth: 5,
    maxNumericValues: 0,
    maxEntryInequalities: 0,
    maxLists: 0,
    maxListElements: 0,
    maxTuples: 0,
    tupleArity: 0,
    includeOwnerV3: false,
    includeOwnerV4: true
  },
  {
    maxObjects: 2,
    maxEntries: 10,
    merkleMaxDepth: 5,
    maxNumericValues: 0,
    maxEntryInequalities: 0,
    maxLists: 0,
    maxListElements: 0,
    maxTuples: 0,
    tupleArity: 0,
    includeOwnerV3: false,
    includeOwnerV4: true
  },
  {
    maxObjects: 2,
    maxEntries: 20,
    merkleMaxDepth: 6,
    maxNumericValues: 0,
    maxEntryInequalities: 0,
    maxLists: 0,
    maxListElements: 0,
    maxTuples: 0,
    tupleArity: 0,
    includeOwnerV3: false,
    includeOwnerV4: true
  },
  {
    maxObjects: 2,
    maxEntries: 22,
    merkleMaxDepth: 6,
    maxNumericValues: 10,
    maxEntryInequalities: 10,
    maxLists: 3,
    maxListElements: 20,
    maxTuples: 3,
    tupleArity: 3,
    includeOwnerV3: false,
    includeOwnerV4: true
  },
  {
    maxObjects: 2,
    maxEntries: 30,
    merkleMaxDepth: 6,
    maxNumericValues: 0,
    maxEntryInequalities: 0,
    maxLists: 0,
    maxListElements: 0,
    maxTuples: 0,
    tupleArity: 0,
    includeOwnerV3: false,
    includeOwnerV4: true
  },
  // Kitchen sink config
  {
    maxObjects: 2,
    maxEntries: 48,
    merkleMaxDepth: 6,
    maxNumericValues: 10,
    maxEntryInequalities: 12,
    maxLists: 5,
    maxListElements: 200,
    maxTuples: 2,
    tupleArity: 2,
    includeOwnerV3: false,
    includeOwnerV4: true
  },
  {
    maxObjects: 2,
    maxEntries: 50,
    merkleMaxDepth: 6,
    maxNumericValues: 0,
    maxEntryInequalities: 0,
    maxLists: 0,
    maxListElements: 0,
    maxTuples: 0,
    tupleArity: 0,
    includeOwnerV3: false,
    includeOwnerV4: true
  },
  /*
   * 3 objects
   */
  {
    maxObjects: 3,
    maxEntries: 10,
    merkleMaxDepth: 6,
    maxNumericValues: 0,
    maxEntryInequalities: 0,
    maxLists: 0,
    maxListElements: 0,
    maxTuples: 0,
    tupleArity: 0,
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
    maxEntries: 20,
    merkleMaxDepth: 6,
    maxNumericValues: 0,
    maxEntryInequalities: 0,
    maxLists: 0,
    maxListElements: 0,
    maxTuples: 0,
    tupleArity: 0,
    includeOwnerV3: false,
    includeOwnerV4: true
  },
  {
    maxObjects: 3,
    maxEntries: 30,
    merkleMaxDepth: 6,
    maxNumericValues: 0,
    maxEntryInequalities: 0,
    maxLists: 0,
    maxListElements: 0,
    maxTuples: 0,
    tupleArity: 0,
    includeOwnerV3: false,
    includeOwnerV4: true
  },
  {
    maxObjects: 3,
    maxEntries: 40,
    merkleMaxDepth: 6,
    maxNumericValues: 0,
    maxEntryInequalities: 0,
    maxLists: 0,
    maxListElements: 0,
    maxTuples: 0,
    tupleArity: 0,
    includeOwnerV3: false,
    includeOwnerV4: true
  },
  // Kitchen sink config
  {
    maxObjects: 3,
    maxEntries: 45,
    merkleMaxDepth: 5,
    maxNumericValues: 10,
    maxEntryInequalities: 20,
    maxLists: 6,
    maxListElements: 200,
    maxTuples: 5,
    tupleArity: 3,
    includeOwnerV3: false,
    includeOwnerV4: true
  },
  {
    maxObjects: 3,
    maxEntries: 50,
    merkleMaxDepth: 6,
    maxNumericValues: 0,
    maxEntryInequalities: 0,
    maxLists: 0,
    maxListElements: 0,
    maxTuples: 0,
    tupleArity: 0,
    includeOwnerV3: false,
    includeOwnerV4: true
  },
  /*
   * 5 objects
   */
  {
    maxObjects: 5,
    maxEntries: 10,
    merkleMaxDepth: 5,
    maxNumericValues: 0,
    maxEntryInequalities: 0,
    maxLists: 0,
    maxListElements: 0,
    maxTuples: 0,
    tupleArity: 0,
    includeOwnerV3: false,
    includeOwnerV4: true
  },
  {
    maxObjects: 5,
    maxEntries: 20,
    merkleMaxDepth: 6,
    maxNumericValues: 0,
    maxEntryInequalities: 0,
    maxLists: 0,
    maxListElements: 0,
    maxTuples: 0,
    tupleArity: 0,
    includeOwnerV3: false,
    includeOwnerV4: true
  },
  {
    maxObjects: 5,
    maxEntries: 30,
    merkleMaxDepth: 6,
    maxNumericValues: 0,
    maxEntryInequalities: 0,
    maxLists: 0,
    maxListElements: 0,
    maxTuples: 0,
    tupleArity: 0,
    includeOwnerV3: false,
    includeOwnerV4: true
  },
  {
    maxObjects: 5,
    maxEntries: 40,
    merkleMaxDepth: 6,
    maxNumericValues: 0,
    maxEntryInequalities: 0,
    maxLists: 0,
    maxListElements: 0,
    maxTuples: 0,
    tupleArity: 0,
    includeOwnerV3: false,
    includeOwnerV4: true
  },
  // Kitchen sink config
  {
    maxObjects: 5,
    maxEntries: 40,
    merkleMaxDepth: 6,
    maxNumericValues: 10,
    maxEntryInequalities: 10,
    maxLists: 4,
    maxListElements: 400,
    maxTuples: 5,
    tupleArity: 3,
    includeOwnerV3: false,
    includeOwnerV4: true
  },
  /*
   * 10 objects
   */
  {
    maxObjects: 10,
    maxEntries: 15,
    merkleMaxDepth: 8,
    maxNumericValues: 15,
    maxEntryInequalities: 30,
    maxLists: 8,
    maxListElements: 500,
    maxTuples: 5,
    tupleArity: 3,
    includeOwnerV3: true,
    includeOwnerV4: true
  },
  // Kitchen sink config
  {
    maxObjects: 10,
    maxEntries: 19,
    merkleMaxDepth: 8,
    maxNumericValues: 10,
    maxEntryInequalities: 10,
    maxLists: 4,
    maxListElements: 450,
    maxTuples: 5,
    tupleArity: 3,
    includeOwnerV3: true,
    includeOwnerV4: true
  },
  {
    maxObjects: 10,
    maxEntries: 20,
    merkleMaxDepth: 6,
    maxNumericValues: 0,
    maxEntryInequalities: 0,
    maxLists: 0,
    maxListElements: 0,
    maxTuples: 0,
    tupleArity: 0,
    includeOwnerV3: true,
    includeOwnerV4: true
  },
  {
    maxObjects: 10,
    maxEntries: 30,
    merkleMaxDepth: 6,
    maxNumericValues: 0,
    maxEntryInequalities: 0,
    maxLists: 0,
    maxListElements: 0,
    maxTuples: 0,
    tupleArity: 0,
    includeOwnerV3: true,
    includeOwnerV4: true
  }
];
