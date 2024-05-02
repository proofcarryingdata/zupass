import * as fastfile from "fastfile";
import { CircuitArtifactPaths, CircuitDesc, CircuitSignal } from "./types";

export type VerificationKey = object;

/**
 * Loads a verification key from a JSON file.
 *
 * @param vkeyPath path to load artifacts, which could be a URL (in browser)
 *   or a file path (in server or utests).
 * @returns the verification key as an object
 * @throws if file access or JSON parsing fails
 */
export async function loadVerificationKey(
  vkeyPath: string
): Promise<VerificationKey> {
  // This method of binary loading files using fastfile is the same as what is
  // used in snarkjs to load pkey and wasm artifacts.  It works for local file
  // paths (in Node) as well as URLs (in browser).
  // The string decoding and JSON parsing is specific to our use of vkeys, which
  // snarkjs assumes are already in memory via import.
  let fd: fastfile.FastFile | undefined = undefined;
  try {
    fd = await fastfile.readExisting(vkeyPath);
    const bytes = await fd.read(fd.totalSize);
    return JSON.parse(Buffer.from(bytes).toString("utf8"));
  } finally {
    if (fd !== undefined) {
      await fd.close();
    }
  }
}

/**
 * Determines the right path for loading circuit artifacts for a given
 * circuit.
 *
 * @param root root path to load artifacts, which could be a URL (in browser)
 *   or a file path (in server or utests).
 * @param cd description of the GPC circuit
 * @returns collection of artifact paths
 */
export function gpcArtifactPaths(
  root: string,
  cd: CircuitDesc
): CircuitArtifactPaths {
  if (!root.endsWith("/")) {
    root = root + "/";
  }

  return {
    wasmPath: root + `${cd.family}_${cd.name}.wasm`,
    pkeyPath: root + `${cd.family}_${cd.name}-pkey.zkey`,
    vkeyPath: root + `${cd.family}_${cd.name}-vkey.json`
  };
}

/**
 * Splits an array `arr` into chunks of size
 * `n` in order. If `arr.length` is not a multiple of `n`,
 * then the last chunk will be of length `arr.length % n`.
 */
export function toChunks<A>(arr: A[], n: number): A[][] {
  return arr.reduce(
    (chunks: A[][], a: A) => {
      const lastChunkIndex = chunks.length - 1;
      const lastChunk = chunks[lastChunkIndex];
      return lastChunk.length < n // If the last chunk is incomplete
        ? chunks.slice(0, lastChunkIndex).concat([lastChunk.concat([a])]) // Append the current value to it.
        : chunks.concat([[a]]); // Else start a new chunk with the current value in it.
    },
    [[]]
  );
}

/**
 * Applies a Promise-valued function to array elements
 * sequentially. Necessary to avoid OOM for particularly
 * heavy computations.
 */
export async function seqPromise<A, B>(
  f: (a: A) => Promise<B>,
  arr: A[]
): Promise<B[]> {
  const outputArray: B[] = [];

  for (const a of arr) {
    outputArray.push(await f(a));
  }

  return outputArray;
}

/**
 * Applies a Promise-values function to array eleemnts
 * `maxParallelPromises` calls at a time.
 */
export async function batchPromise<A, B>(
  maxParallelPromises: number,
  f: (a: A) => Promise<B>,
  arr: A[]
): Promise<B[]> {
  // Execute sequence of promises
  const promisedChunks = await seqPromise(
    (arr) => Promise.all(arr.map(f)), // by mapping each `maxParallelpromises` sized chunk of `arr` by `f`
    toChunks(arr, maxParallelPromises)
  );

  return promisedChunks.flat(); // Then concatenate the chunks.
}
/** Returns an array which is a copy of `inputArray` extended to `totalLength`,
 * with new values filled with `fillValue` (default 0).  Input array is
 * returned as-is if `totalLength` is not longer than its length.
 */
export function extendedSignalArray(
  inputArray: CircuitSignal[],
  totalLength: number,
  fillValue = 0n
): CircuitSignal[] {
  if (totalLength <= inputArray.length) {
    return inputArray;
  }
  return inputArray.concat(
    new Array(totalLength - inputArray.length).fill(fillValue)
  );
}

/**
 * Convert an array of bit signals into a single packed bigint.
 * This will throw an Error if any of the elements is not 0 or 1.
 */
export function array2Bits(boolArray: bigint[]): bigint {
  let bits = 0n;
  for (let i = 0; i < boolArray.length; i++) {
    if (boolArray[i] !== 0n && boolArray[i] !== 1n) {
      throw new Error(
        `Input to array2Bits must be 0n or 1n not ${boolArray[i]}.`
      );
    }
    if (boolArray[i] === 1n) {
      bits |= 1n << BigInt(i);
    }
  }
  return bits;
}
