import { expect } from "chai";
import "mocha";
import {
  EDDSA_PUBKEY_TYPE_STRING,
  PODEntries,
  PODName,
  PODValue,
  POD_INT_MAX,
  POD_VALUE_STRING_TYPE_IDENTIFIER,
  deserializePODEntries,
  podEntriesFromSimplifiedJSON,
  podEntriesToSimplifiedJSON,
  podValueFromRawValue,
  podValueToRawValue,
  serializePODEntries
} from "../src";
import { sampleEntries1, sampleEntries2 } from "./common";

describe("podSerialization serialization should work", async function () {
  it("Default serialization should round-trip samples with exact types", function () {
    for (const testEntries of [sampleEntries1, sampleEntries2]) {
      const serialized = serializePODEntries(testEntries);
      const deserialized = deserializePODEntries(serialized);
      expect(deserialized).to.not.eq(testEntries);
      expect(deserialized).to.deep.eq(testEntries);
    }
  });

  it("Simplified serialization should round-trip samples with compatible types", function () {
    const trickyEntries: PODEntries = {
      url: { type: "string", value: "https://zupass.org/pod" },
      valid_prefix: { type: "string", value: "pod_string:foo" },
      invalid_prefix: { type: "string", value: "pod_wrong:foo" },
      pubkey_hex: {
        type: "eddsa_pubkey",
        value:
          "c433f7a696b7aa3a5224efb3993baf0ccd9e92eecee0c29a3f6c8208a9e81d9e"
      },
      pubkey_base64: {
        type: "eddsa_pubkey",
        value: "zmTuvDM2eku7O4MKaP2yCCKnoHZ4"
      },

      small_crypto: { type: "cryptographic", value: 3n },
      large_int: { type: "int", value: POD_INT_MAX }
    };

    for (const testEntries of [sampleEntries1, sampleEntries2, trickyEntries]) {
      const serialized = podEntriesToSimplifiedJSON(testEntries);
      const deserialized = podEntriesFromSimplifiedJSON(serialized);

      // It's valid to shift cryptographic -> int for small values.  Check
      // that those cases are valid, then manually fix them.
      for (const [name, orgValue] of Object.entries(testEntries)) {
        if (
          orgValue.type === "cryptographic" &&
          orgValue.value <= POD_INT_MAX
        ) {
          const newValue = (deserialized as Record<PODName, PODValue>)[name];
          expect(newValue.type).to.eq("int");
          newValue.type = "cryptographic";
        }
      }

      expect(deserialized).to.not.eq(testEntries);
      expect(deserialized).to.deep.eq(testEntries);
    }
  });

  it("Simplified serialization of string-encoded types should work as expected", function () {
    for (const { type, value, expectedSerialisedValue } of [
      [
        EDDSA_PUBKEY_TYPE_STRING,
        "f27205e5ceeaad24025652cc9f6f18cee5897266f8c0aac5b702d48e0dea3585",
        `pod_${EDDSA_PUBKEY_TYPE_STRING}:f27205e5ceeaad24025652cc9f6f18cee5897266f8c0aac5b702d48e0dea3585`
      ],
      ["string", "hello", "hello"],
      ["string", ":keyword", ":keyword"],
      ["string", "!!:hello", "!!:hello"],
      ["string", "blah:blah", "blah:blah"],
      ["string", "blah:blah:blah:blah", "blah:blah:blah:blah"],
      ["string", "pod_blah:blah", "pod_string:pod_blah:blah"]
    ].map((triple) => {
      return {
        type: triple[0] as POD_VALUE_STRING_TYPE_IDENTIFIER,
        value: triple[1],
        expectedSerialisedValue: triple[2]
      };
    })) {
      const serialisedValue = podValueToRawValue({ type, value });
      expect(serialisedValue).to.eq(expectedSerialisedValue);
      expect(podValueFromRawValue(serialisedValue)).to.deep.eq({ type, value });
    }
  });

  it("Simplified deserialization of string-encoded types should reject invalid inputs", function () {
    expect(() => podValueFromRawValue("pod_strang:hello")).to.throw(Error);
    expect(() => podValueFromRawValue("pod_strin:hello")).to.throw(Error);
    expect(() =>
      podValueFromRawValue(
        "pod_pk:f71b62538fbc40df0d5e5b2034641ae437bdbf06012779590099456cf25b5f8f"
      )
    ).to.throw(Error);
  });
});
