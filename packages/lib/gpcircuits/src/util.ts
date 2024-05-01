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
 * Returns a copy of `inputArray` padded to length `len` with padding
 * `padding`.
 */
export function padArray<A>(inputArr: A[], len: number, padding: A): A[] {
  return inputArr.concat(Array(len - inputArr.length).fill(padding));
}
