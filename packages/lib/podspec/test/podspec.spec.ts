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
import { PodspecDataType } from "../src/base";
import {
  IssueCode,
  PodspecInvalidPodValueIssue,
  PodspecInvalidTypeIssue,
  PodspecIssue
} from "../src/error";
import { p } from "../src/index";
import { PodspecPOD } from "../src/types/pod";

function generateRandomHex(byteLength: number): string {
  const randomBytes = crypto.randomBytes(byteLength);
  return randomBytes.toString("hex");
}

function generateKeyPair(): { privateKey: string; publicKey: string } {
  const privateKey = generateRandomHex(32);
  const publicKey = encodePublicKey(
    derivePublicKey(decodePrivateKey(privateKey))
  );
  return { privateKey, publicKey };
}

describe("podspec should work", async function () {
  it("should validate POD types", function () {
    const myPodSpec = p.entries({
      foo: p.string(),
      bar: p.int(),
      baz: p.cryptographic(),
      quux: p.eddsaPubKey()
    });

    const { publicKey } = generateKeyPair();

    const result = myPodSpec.safeParse({
      foo: { type: "string", value: "test" },
      bar: { type: "int", value: 1n },
      baz: { type: "cryptographic", value: 10000n },
      quux: {
        type: "eddsa_pubkey",
        value: publicKey
      }
    });
    expect(result.isValid).to.eq(true);
    assert(result.isValid);
    expect(result.value.foo.value).to.eq("test");
    expect(result.value.bar.value).to.eq(1n);
    expect(result.value.baz.value).to.eq(10000n);
    expect(result.value.quux.value).to.eq(publicKey);
  });

  it("should coerce javascript values into POD types", function () {
    const myPodSpec = p.entries({
      foo: p.coerce.string(),
      bar: p.coerce.int(),
      baz: p.coerce.cryptographic(),
      quux: p.coerce.eddsaPubKey()
    });

    const { publicKey } = generateKeyPair();

    const result = myPodSpec.safeParse({
      foo: "test",
      bar: 1,
      baz: 10000,
      quux: publicKey
    });
    expect(result.isValid).to.eq(true);
    assert(result.isValid);
    expect(result.value.foo.value).to.eq("test");
    expect(result.value.bar.value).to.eq(1n);
    expect(result.value.baz.value).to.eq(10000n);
    expect(result.value.quux.value).to.eq(publicKey);
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
    expect(result.isValid).to.eq(false);
    assert(result.isValid === false);
    expect(result.issues).to.eql([
      {
        code: IssueCode.invalid_pod_value,
        value: {
          type: "int",
          value: POD_INT_MAX + 1n
        },
        reason: `Invalid value for entry ${"bar"}.  Value ${
          POD_INT_MAX + 1n
        } is outside supported bounds: (min ${POD_INT_MIN}, max ${POD_INT_MAX}).`,
        path: ["bar"]
      }
    ]);
  });

  it("should apply range checks", function () {
    const myPodSpec = p.entries({
      foo: p.coerce.int().range(1n, 10n)
    });

    const result = myPodSpec.safeParse({
      foo: 11n
    });
    expect(result.isValid).to.eq(false);
    assert(result.isValid === false);
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
    expect(result.isValid).to.eq(true);
    assert(result.isValid);

    const result2 = myPodSpec.safeParse({
      foo: "not in list"
    });
    expect(result2.isValid).to.eq(false);
    assert(result2.isValid === false);
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
    expect(result.isValid).to.eq(true);
    assert(result.isValid);

    const result2 = myPodSpec.safeParse({
      foo: 4n
    });
    expect(result2.isValid).to.eq(false);
  });

  it("should match on tuples", function () {
    const myPodSpec = p
      .entries({
        foo: p.coerce.string(),
        bar: p.coerce.int()
      })
      .tuple({
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
      expect(result.isValid).to.eq(true);
    }
    {
      const result = myPodSpec.safeParse({
        foo: "other string",
        bar: 1n
      });
      expect(result.isValid).to.eq(false);
      assert(result.isValid === false);
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
      expect(result.isValid).to.eq(false);
      assert(result.isValid === false);
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
    const myPodSpec = p.pod({
      foo: p.string(),
      bar: p.int()
    });

    const serialized = myPodSpec.serialize();

    expect(p.deserialize(serialized)).to.eql(myPodSpec);
  });

  it("should query across multiple PODs", function () {
    const key = generateRandomHex(32);

    const myPodSpec = p.pod({
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
    const myPodSpec = p.pod({
      foo: p.int().range(1n, 10n)
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
    const { publicKey, privateKey } = generateKeyPair();
    const eventId = "d1390b7b-4ccb-42bf-8c8b-e397b7c26e6c";
    const productId = "d38f0c3f-586b-44c6-a69a-1348481e927d";

    const myPodSpec = p
      .pod({
        eventId: p.string(),
        productId: p.string()
      })
      .tuple({
        name: "test",
        exclude: false,
        entries: ["eventId", "productId", "$signerPublicKey"],
        members: [
          [
            { type: "string", value: eventId },
            { type: "string", value: productId },
            { type: "eddsa_pubkey", value: publicKey }
          ]
        ]
      });

    const pods = [
      POD.sign(
        {
          eventId: { type: "string", value: eventId },
          productId: { type: "string", value: productId }
        },
        privateKey
      ),
      POD.sign(
        {
          eventId: { type: "string", value: uuidv4() },
          productId: { type: "string", value: uuidv4() }
        },
        privateKey
      )
    ];

    const queryResult = myPodSpec.query(pods);

    expect(queryResult.matches).to.eql([pods[0]]);
    expect(queryResult.matchingIndexes).to.eql([0]);
  });

  it("should validate entire PODs", function () {
    const { publicKey, privateKey } = generateKeyPair();
    const eventId = "d1390b7b-4ccb-42bf-8c8b-e397b7c26e6c";
    const productId = "d38f0c3f-586b-44c6-a69a-1348481e927d";

    const myPodSpec = p
      .pod({
        eventId: p.string(),
        productId: p.string()
      })
      .signer(publicKey);

    const pod = POD.sign(
      {
        eventId: { type: "string", value: eventId },
        productId: { type: "string", value: productId }
      },
      privateKey
    );

    const result = myPodSpec.safeParse(pod);
    expect(result.isValid).to.eq(true);
  });

  it("should perform tuple checks on PODs including virtual signer entry", function () {
    const { publicKey, privateKey } = generateKeyPair();
    const eventId = "d1390b7b-4ccb-42bf-8c8b-e397b7c26e6c";
    const productId = "d38f0c3f-586b-44c6-a69a-1348481e927d";

    const myPodSpec = p
      .pod({
        eventId: p.string(),
        productId: p.string()
      })
      .tuple({
        name: "test",
        exclude: false,
        entries: ["eventId", "productId", "$signerPublicKey"],
        members: [
          [
            { type: "string", value: eventId },
            { type: "string", value: productId },
            { type: "eddsa_pubkey", value: publicKey }
          ]
        ]
      });

    {
      const pod = POD.sign(
        {
          eventId: { type: "string", value: eventId },
          productId: { type: "string", value: productId }
        },
        privateKey
      );

      const result = myPodSpec.safeParse(pod);
      expect(result.isValid).to.eq(true);
    }
    {
      const pod = POD.sign(
        {
          eventId: { type: "string", value: uuidv4() },
          productId: { type: "string", value: uuidv4() },
          signerPublicKey: { type: "eddsa_pubkey", value: publicKey }
        },
        privateKey
      );

      const result = myPodSpec.safeParse(pod);
      expect(result.isValid).to.eq(false);
      assert(result.isValid === false);
      expect(result.issues[0].code).to.eq(IssueCode.not_in_tuple_list);
    }
  });

  it("can query for PODs with matching signatures", function () {
    const { publicKey, privateKey } = generateKeyPair();
    const eventId = "d1390b7b-4ccb-42bf-8c8b-e397b7c26e6c";
    const productId = "d38f0c3f-586b-44c6-a69a-1348481e927d";

    const pods = [
      POD.sign(
        {
          eventId: { type: "string", value: eventId },
          productId: { type: "string", value: productId },
          signerPublicKey: { type: "eddsa_pubkey", value: publicKey }
        },
        privateKey
      ),
      POD.sign(
        {
          eventId: { type: "string", value: uuidv4() },
          productId: { type: "string", value: uuidv4() },
          signerPublicKey: { type: "eddsa_pubkey", value: publicKey }
        },
        privateKey
      )
    ];

    const myPodSpec = p
      .pod({
        eventId: p.string(),
        productId: p.string()
      })
      .signature(pods[1].signature);

    const queryResult = myPodSpec.query(pods);

    expect(queryResult.matches).to.eql([pods[1]]);
    expect(queryResult.matchingIndexes).to.eql([1]);
  });

  it("can serialize and deserialize full-POD Podspecs", function () {
    const { publicKey } = generateKeyPair();
    const eventId = "d1390b7b-4ccb-42bf-8c8b-e397b7c26e6c";
    const productId = "d38f0c3f-586b-44c6-a69a-1348481e927d";

    const myPodSpec = p
      .pod({
        eventId: p.string(),
        productId: p.string()
      })
      .tuple({
        name: "test",
        exclude: false,
        entries: ["eventId", "productId", "$signerPublicKey"],
        members: [
          [
            { type: "string", value: eventId },
            { type: "string", value: productId },
            { type: "eddsa_pubkey", value: publicKey }
          ]
        ]
      });

    const serialized = myPodSpec.serialize();
    const deserialized = PodspecPOD.deserialize(serialized);
    expect(deserialized).to.eql(myPodSpec);
  });

  it("should handle optional fields", function () {
    const optionalPodSpec = p.entries({
      foo: p.string(),
      bar: p.int().optional()
    });

    const resultWithOptional = optionalPodSpec.safeParse({
      foo: { type: "string", value: "test" },
      bar: { type: "int", value: 123n }
    });
    expect(resultWithOptional.isValid).to.eq(true);

    const resultWithoutOptional = optionalPodSpec.safeParse({
      foo: { type: "string", value: "test" }
    });
    expect(resultWithoutOptional.isValid).to.eq(true);
  });

  it("should fail to instantiate a Podspec with invalid entries", function () {
    expect(() =>
      p.entries({
        foo: p.string(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        bar: { type: "invalid" } as any
      })
    ).to.throw;
  });

  it("should handle different POD value types in the same spec", function () {
    const { publicKey } = generateKeyPair();
    const myPodSpec = p.entries({
      stringField: p.string(),
      intField: p.int(),
      cryptoField: p.cryptographic(),
      eddsaField: p.eddsaPubKey()
    });

    const validResult = myPodSpec.safeParse({
      stringField: { type: "string", value: "test" },
      intField: { type: "int", value: 123n },
      cryptoField: { type: "cryptographic", value: 456n },
      eddsaField: { type: "eddsa_pubkey", value: publicKey }
    });

    expect(validResult.isValid).to.eq(true);

    const invalidResult = myPodSpec.safeParse({
      stringField: { type: "string", value: null },
      intField: { type: "int", value: POD_INT_MAX + 1n },
      cryptoField: { type: "string", value: "invalid" },
      eddsaField: { type: "eddsa_pubkey", value: "invalidEddsaPubKey" }
    });
    expect(invalidResult.isValid).to.eq(false);
    assert(invalidResult.isValid === false);
    expect(invalidResult.issues).to.eql([
      {
        code: IssueCode.invalid_type,
        expectedType: PodspecDataType.String,
        path: ["stringField"]
      } satisfies PodspecInvalidTypeIssue,
      {
        code: IssueCode.invalid_pod_value,
        value: { type: "int", value: 9223372036854775808n },
        reason:
          "Invalid value for entry intField.  Value 9223372036854775808 is outside supported bounds: (min -9223372036854775808, max 9223372036854775807).",
        path: ["intField"]
      } satisfies PodspecInvalidPodValueIssue,
      {
        code: IssueCode.invalid_type,
        expectedType: PodspecDataType.Cryptographic,
        path: ["cryptoField"]
      } satisfies PodspecInvalidTypeIssue,
      {
        code: IssueCode.invalid_pod_value,
        value: { type: "eddsa_pubkey", value: "invalidEddsaPubKey" },
        reason:
          "Public key should be 32 bytes, encoded as hex or Base64 in eddsaField.",
        path: ["eddsaField"]
      } satisfies PodspecInvalidPodValueIssue
    ]);
  });

  it("should handle empty lists", function () {
    // Matching on empty lists will always fail
    const myPodSpec = p.entries({
      foo: p.coerce.string().list([])
    });

    const result = myPodSpec.safeParse({
      foo: "test"
    });
    expect(result.isValid).to.eq(false);
    assert(result.isValid === false);
    expect(result.issues[0].code).to.eq(IssueCode.not_in_list);
  });
});
