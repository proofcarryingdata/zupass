import { CircuitSignal } from "./types";
import { poseidon1, poseidon2, poseidon3, poseidon4} from "poseidon-lite";

const poseidon = [poseidon2, poseidon3, poseidon4];

export type TupleModuleInputs = {
  valueHash: CircuitSignal[];
  tupleIndices: CircuitSignal[][];
};

export type TupleModuleInputNamesType = [
  "valueHash",
  "tupleIndices"
];

export type TupleModuleOutputs = { tupleHashes: CircuitSignal[] };

export type TupleModuleOutputNamesType = ["tupleHashes"];

export class Tuple {
  /**
   * Computes the hash representation of tuples formed from value hashes
   * and previously computed value hashes (cf. `TupleModule`). Matches
   * the implementation of `TupleModule` and assumes appropriate padding
   * (i.e. `BABY_JUB_NEGATIVE_ONE` for unused tuple indices) and array
   * lengths (i.e. all tuple index tuples must have length matching the
   * tuple arity parameter).
   *
   * @param `paramTupleArity` denotes the tuple arity.
   * @param `paramMaxValues` denotes the maximum number of POD entry values.
   * @param `paramMaxTuples` denotes the maximum number of tuples to form.
   * @param `valueHash` denotes the array of POD entry value hashes.
   * @param `tupleIndices` denotes the list of tuples of indices of
   *  arity `paramTupleArity`, where an index `i` less than `paramMaxValues`
   *  refers to a POD object value with that index and `i >= paramMaxValues`
   *  refers to the `i - paramMaxValues`th tuple.
   * @returns `bigint[]` of tuple hashes.
   * @throws TypeError if the given tuple arity does not lie within [2,4].
   * @throws TypeError if `valueHash.length != paramMaxValues`.
   * @throws TypeError if `tupleIndices.length != paramMaxTuples`.
   * @throws TypeError if `tupleIndices[i].length != paramTupleArity` for any i.
   */
  public static tupleHashes(
    paramTupleArity: number,
    paramMaxValues: number,
    paramMaxTuples: number, // ?
    valueHash: bigint[],
    tupleIndices: bigint[][]
  ): bigint[] {
    // Restrict attention to lower arities (for now?).
    if ((paramTupleArity < 2) || (paramTupleArity > 4))
      throw new TypeError("Tuple arity must lie between 2 and 4.");

    // Check the length of `valueHash`.
    if (valueHash.length != paramMaxValues)
      throw new TypeError(`The length of valueHash (${valueHash.length}) is not equal to ${paramMaxValues}.`);
    
    // Check the dimensions of `tupleIndices`.
    if (tupleIndices.length != paramMaxTuples)
      throw new TypeError(`The number of tuple indices given (${tupleIndices.length}) should equal ${paramMaxTuples}.`);
    tupleIndices.forEach((nthTupleIndices, i) => { if(nthTupleIndices.length != paramTupleArity) throw new TypeError(`The arity of tupleIndices[${i}] is not equal to the fixed tuple arity (${paramTupleArity}).`);});
    
    
    // Select the right hash function
    const hash = poseidon[paramTupleArity - 2];

    // Form `tupleHashes[i]` by taking each index tuple in `tupleIndices`,
    // mapping it to the corresponding value tuple by looking the values
    // up in `valueHash.concat(tupleHashes.slice(0, i))` and hashing
    // the result using Poseidon.
    const tupleHashes = tupleIndices
      .reduce((tupleHashes, indexArray) =>
	tupleHashes.concat(
	  [hash(indexArray
	    .map(i => (i < BigInt(paramMaxValues)) ? valueHash[Number(i)] // Conversion OK since `i` is small.
	      : (i < BigInt(paramMaxValues + tupleHashes.length)) ? tupleHashes[Number(i) - paramMaxValues] // `i` is still small.
	      : 0))]), []);

    return tupleHashes;
  }
}
