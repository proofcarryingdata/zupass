import { expect } from "chai";
import "mocha";
import path from "path";
import { chooseCircuitFamilyForTests } from "../scripts/common";
import {
  githubDownloadRootURL,
  gpcArtifactPaths,
  jsdelivrDownloadRootURL,
  unpkgDownloadRootURL
} from "../src";

const { testCircuitFamily } = chooseCircuitFamilyForTests();

describe("artifact URL helpers should work", function () {
  it("gpcArtifactPaths should work for file paths", async () => {
    const root = path.join(__dirname, "../artifacts/test");
    const paths: Set<string> = new Set();
    for (const circuitDesc of testCircuitFamily) {
      const artifacts = gpcArtifactPaths(root, circuitDesc);

      expect(artifacts.wasmPath.startsWith(root)).to.be.true;
      expect(artifacts.wasmPath).to.match(/.*\.wasm/);
      expect(paths.has(artifacts.wasmPath)).to.be.false;
      paths.add(artifacts.wasmPath);

      expect(artifacts.pkeyPath.startsWith(root)).to.be.true;
      expect(artifacts.pkeyPath).to.not.be.empty;
      expect(artifacts.pkeyPath).to.match(/.*-pkey\.zkey/);
      expect(paths.has(artifacts.pkeyPath)).to.be.false;
      paths.add(artifacts.pkeyPath);

      expect(artifacts.vkeyPath.startsWith(root)).to.be.true;
      expect(artifacts.vkeyPath).to.match(/.*-vkey\.json/);
      expect(paths.has(artifacts.vkeyPath)).to.be.false;
      paths.add(artifacts.vkeyPath);
    }
  });

  it("gpcArtifactPaths should work for URL paths", async () => {
    const root = "https://myhost.com/somepath";
    const paths: Set<string> = new Set();
    for (const circuitDesc of testCircuitFamily) {
      const artifacts = gpcArtifactPaths(root, circuitDesc);

      expect(artifacts.wasmPath.startsWith(root)).to.be.true;
      expect(artifacts.wasmPath).to.match(/.*\.wasm/);
      expect(paths.has(artifacts.wasmPath)).to.be.false;
      paths.add(artifacts.wasmPath);

      expect(artifacts.pkeyPath.startsWith(root)).to.be.true;
      expect(artifacts.pkeyPath).to.not.be.empty;
      expect(artifacts.pkeyPath).to.match(/.*-pkey\.zkey/);
      expect(paths.has(artifacts.pkeyPath)).to.be.false;
      paths.add(artifacts.pkeyPath);

      expect(artifacts.vkeyPath.startsWith(root)).to.be.true;
      expect(artifacts.vkeyPath).to.match(/.*-vkey\.json/);
      expect(paths.has(artifacts.vkeyPath)).to.be.false;
      paths.add(artifacts.vkeyPath);
    }
  });

  it("gpcArtifactPaths should allow relative paths with or without leading slash", async () => {
    const pathsNoSlash = gpcArtifactPaths("foo/bar", testCircuitFamily[0]);
    expect(pathsNoSlash.pkeyPath.startsWith("foo/bar")).to.be.true;
    expect(pathsNoSlash.vkeyPath.startsWith("foo/bar")).to.be.true;
    expect(pathsNoSlash.wasmPath.startsWith("foo/bar")).to.be.true;

    const pathsWithSlash = gpcArtifactPaths("/foo/bar", testCircuitFamily[0]);
    expect(pathsWithSlash.pkeyPath.startsWith("/foo/bar")).to.be.true;
    expect(pathsWithSlash.vkeyPath.startsWith("/foo/bar")).to.be.true;
    expect(pathsWithSlash.wasmPath.startsWith("/foo/bar")).to.be.true;

    const pathsSlashRoot = gpcArtifactPaths("/", testCircuitFamily[0]);
    expect(pathsSlashRoot.pkeyPath.startsWith("/")).to.be.true;
    expect(pathsSlashRoot.vkeyPath.startsWith("/")).to.be.true;
    expect(pathsSlashRoot.wasmPath.startsWith("/")).to.be.true;

    const pathsEmptyRoot = gpcArtifactPaths("", testCircuitFamily[0]);
    expect(pathsEmptyRoot.pkeyPath).to.not.contain("/");
    expect(pathsEmptyRoot.vkeyPath).to.not.contain("/");
    expect(pathsEmptyRoot.wasmPath).to.not.contain("/");
  });

  it("githubDownloadRootURL should work", async () => {
    expect(githubDownloadRootURL("repo0", "family1", "rev2")).to.eq(
      "https://raw.githubusercontent.com/repo0/rev2/packages/family1"
    );
    expect(
      githubDownloadRootURL("repo/path0", "family/path1", "rev/path2")
    ).to.eq(
      "https://raw.githubusercontent.com/repo/path0/rev/path2/packages/family/path1"
    );
  });

  it("unpkgDownloadRootURL should work", async () => {
    expect(unpkgDownloadRootURL("family1", "ver2")).to.eq(
      "https://unpkg.com/@pcd/family1-artifacts@ver2"
    );
  });

  it("jsdelivrDownloadRootURL should work", async () => {
    expect(jsdelivrDownloadRootURL("family1", "ver2")).to.eq(
      "https://cdn.jsdelivr.net/npm/@pcd/family1-artifacts@ver2"
    );
  });
});
