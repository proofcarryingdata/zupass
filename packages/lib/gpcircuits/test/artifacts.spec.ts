import { expect } from "chai";
import "mocha";
import path from "path";
import {
  ProtoPODGPC,
  githubDownloadRootURL,
  gpcArtifactPaths,
  unpkgDownloadRootURL
} from "../src";

describe("artifact URL helpers should work", function () {
  it("gpcArtifactPaths should work for file paths", async () => {
    const root = path.join(__dirname, "../artifacts/test");
    const paths: Set<string> = new Set();
    for (const circuitDesc of ProtoPODGPC.CIRCUIT_FAMILY) {
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
    for (const circuitDesc of ProtoPODGPC.CIRCUIT_FAMILY) {
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

  it("githubDownloadRootURL should work", async () => {
    expect(unpkgDownloadRootURL("family1", "ver2")).to.eq(
      "https://unpkg.com/@pcd/family1-artifacts@ver2"
    );
  });
});
