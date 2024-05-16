import { expect } from "chai";
import "mocha";
import path from "path";
import { ProtoPODGPC, githubDownloadRootURL, gpcArtifactPaths } from "../src";

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
    expect(githubDownloadRootURL("family1", "rev2")).to.eq(
      "https://raw.githubusercontent.com/proofcarryingdata/snark-artifacts/rev2/packages/family1"
    );
    expect(githubDownloadRootURL("family/path1", "rev/path2")).to.eq(
      "https://raw.githubusercontent.com/proofcarryingdata/snark-artifacts/rev/path2/packages/family/path1"
    );
  });
});
