/// <reference types="./declarations/fastfile.d.ts" />
import * as fastfile from "fastfile";
import urljoin from "url-join";
import { CircuitArtifactPaths, CircuitDesc } from "./types";

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
  } catch (e) {
    console.warn(`Failed to load verification key from file ${vkeyPath}`, e);
    throw e;
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
  return {
    wasmPath: urljoin(root, `${cd.family}_${cd.name}.wasm`),
    pkeyPath: urljoin(root, `${cd.family}_${cd.name}-pkey.zkey`),
    vkeyPath: urljoin(root, `${cd.family}_${cd.name}-vkey.json`)
  };
}

/**
 * Forms a root URL for direct download of artifacts from GitHub.  Pass this
 * root to {@link gpcArtifactPaths} to get paths to individual artifacts.
 *
 * @param family the name of the GPC family
 * @param revision the GitHub revision identifier, which can be a branch, tag,
 *   or commit hash
 * @returns root URL
 */
export function githubDownloadRootURL(
  repoName: string,
  family: string,
  revision: string
): string {
  return `https://raw.githubusercontent.com/${repoName}/${revision}/packages/${family}`;
}

/**
 * Forms a root URL for direct download of artifacts from NPM via unpkg.
 * Pass this root to {@link gpcArtifactPaths} to get paths to individual
 * artifacts.
 *
 * @param family the name of the GPC family
 * @param version the NPM version identifier
 * @returns root URL
 */
export function unpkgDownloadRootURL(family: string, version: string): string {
  const packageName = `@pcd/${family}-artifacts`;
  return `https://unpkg.com/${packageName}@${version}`;
}

/**
 * Forms a root URL for direct download of artifacts from NPM via jsdelivr.
 * Pass this root to {@link gpcArtifactPaths} to get paths to individual
 * artifacts.
 *
 * @param family the name of the GPC family
 * @param version the NPM version identifier
 * @returns root URL
 */
export function jsdelivrDownloadRootURL(
  family: string,
  version: string
): string {
  const packageName = `@pcd/${family}-artifacts`;
  return `https://cdn.jsdelivr.net/npm/${packageName}@${version}`;
}
