import path from "path";
import { CircuitArtifactPaths, CircuitDesc } from "./types";

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
  let outputArray: B[] = [];

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
