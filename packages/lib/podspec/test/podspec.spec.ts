import { encodePublicKey, POD, POD_INT_MAX } from "@pcd/pod";
import { derivePublicKey } from "@zk-kit/eddsa-poseidon";
import { assert, expect } from "chai";
import crypto from "crypto";
import "mocha";
import { p } from "../src/index";

function generateRandomHex(byteLength: number): string {
  const randomBytes = crypto.randomBytes(byteLength);
  return randomBytes.toString("hex");
}

describe("podspec should work", async function () {
  it("should validate POD types", function () {
    const myPodSpec = p.entries({
      foo: p.string(),
      bar: p.integer(),
      baz: p.cryptographic(),
      quux: p.eddsaPubKey()
    });

    const pubKey = encodePublicKey(derivePublicKey(generateRandomHex(32)));

    const result = myPodSpec.safeParse({
      foo: { type: "string", value: "test" },
      bar: { type: "int", value: 1n },
      baz: { type: "cryptographic", value: 10000n },
      quux: {
        type: "eddsa_pubkey",
        value: pubKey
      }
    });
    expect(result.status).to.eq("valid");
    assert(result.status === "valid");
    expect(result.value.foo.value).to.eq("test");
    expect(result.value.bar.value).to.eq(1n);
    expect(result.value.baz.value).to.eq(10000n);
    expect(result.value.quux.value).to.eq(pubKey);
  });

  it("should coerce javascript values into POD types", function () {
    const myPodSpec = p.entries({
      foo: p.coerce.string(),
      bar: p.coerce.integer(),
      baz: p.coerce.cryptographic(),
      quux: p.coerce.eddsaPubKey()
    });

    const pubKey = encodePublicKey(derivePublicKey(generateRandomHex(32)));

    const result = myPodSpec.safeParse({
      foo: "test",
      bar: 1,
      baz: 10000,
      quux: pubKey
    });
    expect(result.status).to.eq("valid");
    assert(result.status === "valid");
    expect(result.value.foo.value).to.eq("test");
    expect(result.value.bar.value).to.eq(1n);
    expect(result.value.baz.value).to.eq(10000n);
    expect(result.value.quux.value).to.eq(pubKey);
  });

  it("should fail with bad inputs", function () {
    const myPodSpec = p.entries({
      foo: p.coerce.string(),
      bar: p.coerce.integer()
    });

    const result = myPodSpec.safeParse({
      foo: "test",
      bar: POD_INT_MAX + 1n
    });
    expect(result.status).to.eq("invalid");
  });

  it("should apply range checks", function () {
    const myPodSpec = p.entries({
      foo: p.coerce.integer().inRange(1n, 10n)
    });

    const result = myPodSpec.safeParse({
      foo: 11n
    });
    expect(result.status).to.eq("invalid");
  });

  it("should match on tuples", function () {
    const myPodSpec = p
      .entries({
        foo: p.coerce.string(),
        bar: p.coerce.integer()
      })
      .matchTuple({
        name: "test",
        exclude: false,
        entries: ["foo", "bar"],
        members: [
          [
            { type: "string", value: "test" },
            { type: "int", value: 1n }
          ]
        ]
      });

    {
      const result = myPodSpec.safeParse({
        foo: "test",
        bar: 1n
      });
      expect(result.status).to.eq("valid");
    }
    {
      const result = myPodSpec.safeParse({
        foo: "other string",
        bar: 1n
      });
      expect(result.status).to.eq("invalid");
    }
  });

  it("podspec should serialize", function () {
    const myPodSpec = p.entries({
      foo: p.string(),
      bar: p.integer()
    });

    expect(myPodSpec.serialize()).to.eql({
      foo: { type: "string", checks: [], coerce: false },
      bar: { type: "int", checks: [], coerce: false }
    });
  });

  it("should query across multiple PODs", function () {
    const key = generateRandomHex(32);

    const myPodSpec = p.entries({
      foo: p.string(),
      bar: p.integer()
    });

    const pods = [
      POD.sign(
        {
          foo: { type: "string", value: "just a string" }
        },
        key
      ),
      POD.sign(
        {
          foo: { type: "string", value: "test" },
          bar: { type: "int", value: 1n }
        },
        key
      )
    ];

    const queryResult = myPodSpec.query(pods);

    expect(queryResult.matches[0]).to.eq(pods[1]);
    expect(queryResult.matchingIndexes).to.eql([1]);
  });

  it("should apply range checks in queries", function () {
    const key = generateRandomHex(32);
    const myPodSpec = p.entries({
      foo: p.integer().inRange(1n, 10n)
    });

    const pods = [
      POD.sign({ foo: { type: "int", value: 1n } }, key),
      POD.sign({ foo: { type: "int", value: 11n } }, key),
      POD.sign({ foo: { type: "int", value: 0n } }, key)
    ];

    const queryResult = myPodSpec.query(pods);

    expect(queryResult.matches).to.eql([pods[0]]);
    expect(queryResult.matchingIndexes).to.eql([0]);
  });
});
