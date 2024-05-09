import { CircuitSignal } from "./types";
import { poseidon2, poseidon3, poseidon4 } from "poseidon-lite";

// We restrict attention to smaller tuple sizes for simplicity, i.e.
// arities 2, 3 and 4.
const poseidon = [poseidon2, poseidon3, poseidon4];

export type TupleHasherInputs = {
  tupleElements: CircuitSignal[];
  tupleIndices: CircuitSignal[];
};

export type TupleHasherInputNamesType = ["tupleElements", "tupleIndices"];

export type TupleHasherOutputs = { tupleHash: CircuitSignal };

export type TupleHasherOutputNamesType = ["tupleHash"];

/**
 * Computes the (Poseidon) hash of a tuple of elements.
 *
 * @throws RangeError if `paramTupleArity` is outside the admissible range
 */
export function tupleHasher(tuple: bigint[]): bigint {
  const tupleArity = tuple.length;

  // Verify that the tuple arity is valid
  if (tupleArity < 2 || tupleArity > 4) {
    throw new RangeError("The tuple arity must lie between 2 and 4.");
  }

  return poseidon[tupleArity - 2](tuple);
}
