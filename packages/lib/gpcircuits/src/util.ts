import path from "path";
import { CircuitArtifactPaths, CircuitDesc } from "./types";
import * as fs from "fs/promises";

export function artifactPaths(
  root: string,
  cd: CircuitDesc
): CircuitArtifactPaths {
  return {
    wasmPath: path.join(root, cd.name + ".wasm"),
    pkeyPath: path.join(root, cd.name + "-pkey.zkey"),
    vkeyPath: path.join(root, cd.name + "-vkey.json")
  };
}

/**
 * Helpers
 */

// Procedure for splitting an array `arr` into chunks of size
// `n` in order. If `arr.length` is not a multiple of `n`,
// then the last chunk will be of length `arr.length % n`.
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

// Procedure for applying a Promise-valued function to
// array elements sequentially. Necessary to avoid OOM
// for particularly heavy computations.
export function seqPromise<A, B>(
  f: (a: A) => Promise<B>,
  arr: A[]
): Promise<B[]> {
  // Delayed/lazy form of f
  const delayedF: (a: A) => () => Promise<B> = (a) => () => f(a);
  return arr
    .map(delayedF) // Delay the fulfilment of each promise.
    .reduce(
      (promisesPast: Promise<B[]>, delayedPromise: () => Promise<B>) =>
        promisesPast.then((arr) =>
          delayedPromise().then((x: B) => arr.concat([x]))
        ),
      Promise.resolve([]) // Start with an empty promise.
    );
}

// Procedure for applying a Promise-values function to
// array eleemnts `maxParallelPromises` calls at a time.
export function batchPromise<A, B>(
  maxParallelPromises: number,
  f: (a: A) => Promise<B>,
  arr: A[]
): Promise<B[]> {
  const concatenateArrays: <C>(arrays: C[][]) => C[] = (arrays) =>
    arrays.reduce(
      (concatenatedArray, arr) => concatenatedArray.concat(arr),
      []
    );
  // Execute sequence of promises
  return seqPromise(
    (arr) => Promise.all(arr.map(f)), // by mapping each `maxParallelpromises` sized chunk of `arr` by `f`
    toChunks(arr, maxParallelPromises)
  ).then(concatenateArrays); // Then concatenate the resulting arrays.
}

// Maximum number of parallel promises to avoid
// OOM issues.
export const maxParallelPromises = 4;

// Filesystem-related helpers
// A procedure for clearing a directory.
export async function clearDir(directory: string) {
  for (const file of await fs.readdir(directory)) {
    await fs.rm(path.join(directory, file));
  }
}
