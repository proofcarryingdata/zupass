import { expect } from "chai";
import "mocha";
import { GPCProofEntryConfig, GPCProofEntryConfigCommon } from "../src";
import {
  canonicalizeEntryConfig,
  canonicalizeSignerPublicKeyConfig
} from "../src/gpcUtil";

describe("Object entry configuration canonicalization should work", () => {
  it("should work as expected on a typical POD entry configuration with isOwnerID = false", () => {
    const config: GPCProofEntryConfig = {
      isNotMemberOf: "someOtherList",
      isOwnerID: false,
      equalsEntry: "pod0.B",
      isMemberOf: "someList",
      isRevealed: true
    };

    const canonicalizedConfig = canonicalizeEntryConfig(config);

    const expectedCanonicalizedConfig = {
      isRevealed: true,
      equalsEntry: "pod0.B",
      isMemberOf: "someList",
      isNotMemberOf: "someOtherList"
    };

    expect(canonicalizedConfig).to.deep.eq(expectedCanonicalizedConfig);
  });
  it("should work as expected on a typical POD entry configuration with isOwnerID = true", () => {
    const config: GPCProofEntryConfig = {
      isNotMemberOf: "someOtherList",
      isOwnerID: true,
      equalsEntry: "pod0.B",
      isMemberOf: "someList",
      isRevealed: true
    };

    const canonicalizedConfig = canonicalizeEntryConfig(config);

    const expectedCanonicalizedConfig = {
      isRevealed: true,
      isOwnerID: true,
      equalsEntry: "pod0.B",
      isMemberOf: "someList",
      isNotMemberOf: "someOtherList"
    };

    expect(canonicalizedConfig).to.deep.eq(expectedCanonicalizedConfig);
  });
});

describe("Object signer's public key configuration canonicalization should work", () => {
  it("should work as expected on a trivial POD signer's public key configuration", () => {
    const config: GPCProofEntryConfigCommon = {
      isRevealed: true
    };

    const canonicalizedConfig = canonicalizeSignerPublicKeyConfig(config);

    expect(canonicalizedConfig).to.be.undefined;
  });
  it("should work as expected on a typical POD signer's public key configuration", () => {
    const config: GPCProofEntryConfigCommon = {
      isNotMemberOf: "someOtherList",
      equalsEntry: "pod0.key",
      isMemberOf: "someList",
      isRevealed: true
    };

    const canonicalizedConfig = canonicalizeSignerPublicKeyConfig(config);

    const expectedCanonicalizedConfig = {
      isRevealed: true,
      equalsEntry: "pod0.key",
      isMemberOf: "someList",
      isNotMemberOf: "someOtherList"
    };

    expect(canonicalizedConfig).to.deep.eq(expectedCanonicalizedConfig);
  });
});
// TODO(POD-P3): More tests
