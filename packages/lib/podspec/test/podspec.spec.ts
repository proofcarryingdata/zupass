import {
  decodePrivateKey,
  encodePublicKey,
  POD,
  POD_INT_MAX,
  POD_INT_MIN
} from "@pcd/pod";
import { derivePublicKey } from "@zk-kit/eddsa-poseidon";
import { assert, expect } from "chai";
import crypto from "crypto";
import "mocha";
import { v4 as uuidv4 } from "uuid";
import { IssueCode, PodspecIssue } from "../src/error";
import { p } from "../src/index";

function generateRandomHex(byteLength: number): string {
  const randomBytes = crypto.randomBytes(byteLength);
  return randomBytes.toString("hex");
}

describe("podspec should work", async function () {
  it("should validate POD types", function () {
    const myPodSpec = p.entries({
      foo: p.string(),
      bar: p.int(),
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
      bar: p.coerce.int(),
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
      bar: p.coerce.int()
    });

    const result = myPodSpec.safeParse({
      foo: "test",
      bar: POD_INT_MAX + 1n
    });
    expect(result.status).to.eq("invalid");
    assert(result.status === "invalid");
    expect(result.issues).to.eql([
      {
        code: IssueCode.invalid_pod_value,
        value: {
          type: "int",
          value: POD_INT_MAX + 1n
        },
        reason: `Invalid value for entry ${"bar"}.       Value ${
          POD_INT_MAX + 1n
        } is outside supported bounds: (min ${POD_INT_MIN}, max ${POD_INT_MAX}).`,
        path: ["bar"]
      }
    ]);
  });

  it("should apply range checks", function () {
    const myPodSpec = p.entries({
      foo: p.coerce.int().inRange(1n, 10n)
    });

    const result = myPodSpec.safeParse({
      foo: 11n
    });
    expect(result.status).to.eq("invalid");
    assert(result.status === "invalid");
    expect(result.issues).to.eql([
      {
        code: IssueCode.not_in_range,
        min: 1n,
        max: 10n,
        value: 11n,
        path: ["foo"]
      } satisfies PodspecIssue
    ]);
  });

  it("should test string entries for list membership", function () {
    const myPodSpec = p.entries({
      foo: p.coerce.string().list(["test", "other string"])
    });

    const result = myPodSpec.safeParse({
      foo: "test"
    });
    expect(result.status).to.eq("valid");

    const result2 = myPodSpec.safeParse({
      foo: "not in list"
    });
    expect(result2.status).to.eq("invalid");
    assert(result2.status === "invalid");
    expect(result2.issues).to.eql([
      {
        code: IssueCode.not_in_list,
        value: "not in list",
        list: ["test", "other string"],
        path: ["foo"]
      } satisfies PodspecIssue
    ]);
  });

  it("should test integer entries for list membership", function () {
    const myPodSpec = p.entries({
      foo: p.coerce.int().list([1n, 2n, 3n])
    });

    const result = myPodSpec.safeParse({
      foo: 1n
    });
    expect(result.status).to.eq("valid");

    const result2 = myPodSpec.safeParse({
      foo: 4n
    });
    expect(result2.status).to.eq("invalid");
  });

  it("should match on tuples", function () {
    const myPodSpec = p
      .entries({
        foo: p.coerce.string(),
        bar: p.coerce.int()
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
      assert(result.status === "invalid");
      expect(result.issues).to.eql([
        {
          code: IssueCode.not_in_tuple_list,
          value: [
            { type: "string", value: "other string" },
            { type: "int", value: 1n }
          ],
          list: [
            [
              { type: "string", value: "test" },
              { type: "int", value: 1n }
            ]
          ],
          path: []
        } satisfies PodspecIssue
      ]);
    }
    {
      const result = myPodSpec.safeParse({
        foo: "test",
        bar: 2n
      });
      expect(result.status).to.eq("invalid");
      assert(result.status === "invalid");
      expect(result.issues).to.eql([
        {
          code: IssueCode.not_in_tuple_list,
          value: [
            { type: "string", value: "test" },
            { type: "int", value: 2n }
          ],
          list: [
            [
              { type: "string", value: "test" },
              { type: "int", value: 1n }
            ]
          ],
          path: []
        } satisfies PodspecIssue
      ]);
    }
  });

  it("podspec should serialize", function () {
    const myPodSpec = p.entries({
      foo: p.string(),
      bar: p.int()
    });

    expect(myPodSpec.serialize()).to.eql({
      entries: {
        foo: { type: "string", checks: [], coerce: false },
        bar: { type: "int", checks: [], coerce: false }
      },
      checks: []
    });
  });

  it("podspec should deserialize", function () {
    const myPodSpec = p.entries({
      foo: p.string(),
      bar: p.int()
    });

    const serialized = myPodSpec.serialize();

    expect(p.deserialize(serialized)).to.eql(myPodSpec);
  });

  it("should query across multiple PODs", function () {
    const key = generateRandomHex(32);

    const myPodSpec = p.entries({
      foo: p.string(),
      bar: p.int()
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
      foo: p.int().inRange(1n, 10n)
    });

    const pods = [
      POD.sign({ foo: { type: "int", value: 1n } }, key),
      POD.sign({ foo: { type: "int", value: 11n } }, key),
      POD.sign({ foo: { type: "int", value: 0n } }, key),
      POD.sign({ foo: { type: "int", value: 10n } }, key)
    ];

    const queryResult = myPodSpec.query(pods);

    expect(queryResult.matches).to.eql([pods[0], pods[3]]);
    expect(queryResult.matchingIndexes).to.eql([0, 3]);
  });

  it("should match on tuples in queries", function () {
    const key = generateRandomHex(32);
    const pubKey = encodePublicKey(derivePublicKey(key));
    const eventId = "d1390b7b-4ccb-42bf-8c8b-e397b7c26e6c";
    const productId = "d38f0c3f-586b-44c6-a69a-1348481e927d";

    const myPodSpec = p
      .entries({
        eventId: p.string(),
        productId: p.string(),
        // @todo add a special check for signer public keys
        // for now, treat it as an entry
        signerPublicKey: p.eddsaPubKey()
      })
      .matchTuple({
        name: "test",
        exclude: false,
        entries: ["eventId", "productId", "signerPublicKey"],
        members: [
          [
            { type: "string", value: eventId },
            { type: "string", value: productId },
            { type: "eddsa_pubkey", value: pubKey }
          ]
        ]
      });

    const pods = [
      POD.sign(
        {
          eventId: { type: "string", value: eventId },
          productId: { type: "string", value: productId },
          signerPublicKey: { type: "eddsa_pubkey", value: pubKey }
        },
        key
      ),
      POD.sign(
        {
          eventId: { type: "string", value: uuidv4() },
          productId: { type: "string", value: uuidv4() },
          signerPublicKey: { type: "eddsa_pubkey", value: pubKey }
        },
        key
      )
    ];

    const queryResult = myPodSpec.query(pods);

    expect(queryResult.matches).to.eql([pods[0]]);
    expect(queryResult.matchingIndexes).to.eql([0]);
  });

  it("should validate entire PODs", function () {
    const key = generateRandomHex(32);
    const keyBytes = decodePrivateKey(key);
    const pubKey = encodePublicKey(derivePublicKey(keyBytes));
    const eventId = "d1390b7b-4ccb-42bf-8c8b-e397b7c26e6c";
    const productId = "d38f0c3f-586b-44c6-a69a-1348481e927d";

    const myPodSpec = p
      .POD({
        eventId: p.string(),
        productId: p.string()
      })
      .signer(pubKey);

    const pod = POD.sign(
      {
        eventId: { type: "string", value: eventId },
        productId: { type: "string", value: productId }
      },
      key
    );

    const result = myPodSpec.safeParse(pod);
    expect(result.status).to.eq("valid");
  });
});
