import * as fastfile from "fastfile";
import { PathLike } from "fs";
import path from "path";
import { CircuitArtifactPaths, CircuitDesc, CircuitSignal } from "./types";

/**
 * Represents a pre-loaded verification key to be passed to SnarkJS, as loaded
 * by {@link loadVerificationKey}.
 */
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
  const chunks: A[][] = [[]];

  for (const a of arr) {
    const lastChunkIndex = chunks.length - 1;
    const lastChunk = chunks[lastChunkIndex];
    if (lastChunk.length < n) {
      lastChunk.push(a);
    } else {
      chunks.push([a]);
    }
  }

  return chunks;
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
  const chunks = await seqPromise(
    (arr) => Promise.all(arr.map(f)), // by mapping each `maxParallelpromises` sized chunk of `arr` by `f`
    toChunks(arr, maxParallelPromises)
  );

  return chunks.flat(); // Then concatenate the chunks.
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

/**
 * Loads the configuration for Circomkit for use in unit tests or scripts.
 * All paths in the config will be fixed up to be based on the given package
 * path, rather than relative to the current working directory.
 *
 * @param gpcircuitsPackagePath file path to the root of the gpcircuits
 *   package in the repo
 * @param readFileSync callable function for readFileSync, or a compatible
 *   replacement in browser.  This is necessary to avoid polyfill errors since
 *   this function is intended for utests, but included in a library which
 *   can be loaded in a browser.
 * @returns a Circomkit config object suitable for the Circomkit constructor.
 */
export function loadCircomkitConfig(
  gpcircuitsPackagePath: string,
  readFileSync: (path: PathLike, options: BufferEncoding) => string
): object {
  function replaceConfigPath(
    configValue: string,
    gpcircuitsPath: string
  ): string {
    if (configValue.startsWith("./")) {
      return configValue.replace(/^\.\//, gpcircuitsPath + "/");
    } else if (configValue.startsWith("../")) {
      return path.join(gpcircuitsPath, configValue);
    }
    return configValue;
  }
  function replaceConfigPaths(
    config: Record<string, string | string[]>,
    gpcircuitsPath: string
  ): object {
    for (const [name, value] of Object.entries(config)) {
      if (typeof value === "string") {
        config[name] = replaceConfigPath(value, gpcircuitsPath);
      } else if (typeof value === "object" && Array.isArray(value)) {
        config[name] = value.map((p) => replaceConfigPath(p, gpcircuitsPath));
      }
    }
    return config;
  }
  return replaceConfigPaths(
    JSON.parse(
      readFileSync(path.join(gpcircuitsPackagePath, "circomkit.json"), "utf-8")
    ),
    gpcircuitsPackagePath
  );
}
