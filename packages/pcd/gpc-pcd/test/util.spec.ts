import { expect } from "chai";
import JSONBig from "json-bigint";
import {
  GPCPCDPrescribedPODValues,
  gpcPCDPrescribedPODValuesFromSimplifiedJSON,
  gpcPCDPrescribedPODValuesToSimplifiedJSON
} from "../src";

const jsonBigSerializer = JSONBig({
  useNativeBigInt: true,
  alwaysParseAsBig: true
});

describe("GPCPCDPrescribedValues serialisation should work", () => {
  it("Should serialise and deserialise empty object", async function () {
    const serialised = gpcPCDPrescribedPODValuesToSimplifiedJSON({});
    const expectedSerialised = "{}";
    const deserialised =
      gpcPCDPrescribedPODValuesFromSimplifiedJSON(serialised);
    expect(serialised).to.eq(expectedSerialised);
    expect(deserialised).to.deep.eq({});
  });

  it("Should serialise and deserialise record containing typical POD data", () => {
    const typicalPrescribedValues: GPCPCDPrescribedPODValues = {
      pod1: {
        entries: {
          ticketID: { type: "int", value: 5558n },
          eventID: { type: "int", value: 0n }
        },
        signerPublicKey: "xDP3ppa3qjpSJO+zmTuvDM2eku7O4MKaP2yCCKnoHZ4"
      },
      pod2: {
        entries: {
          hp: { type: "int", value: 55n }
        }
      },
      pod3: {
        signerPublicKey: "oyL3ppa3qjpSJO+zmTuvDM2eku7O4KKaP2yCCKnoHZo"
      }
    };

    const serialised = gpcPCDPrescribedPODValuesToSimplifiedJSON(
      typicalPrescribedValues
    );

    const expectedSerialised = jsonBigSerializer.stringify({
      pod1: {
        entries: {
          ticketID: 5558n,
          eventID: 0n
        },
        signerPublicKey: "xDP3ppa3qjpSJO+zmTuvDM2eku7O4MKaP2yCCKnoHZ4"
      },
      pod2: {
        entries: {
          hp: 55n
        }
      },
      pod3: {
        signerPublicKey: "oyL3ppa3qjpSJO+zmTuvDM2eku7O4KKaP2yCCKnoHZo"
      }
    });

    const deserialised =
      gpcPCDPrescribedPODValuesFromSimplifiedJSON(serialised);

    expect(serialised).to.eq(expectedSerialised);
    expect(deserialised).to.deep.eq(typicalPrescribedValues);
  });

  it("Should fail to deserialise a string not representing an object", () => {
    expect(() =>
      gpcPCDPrescribedPODValuesFromSimplifiedJSON(`"hello"`)
    ).to.throw(TypeError);
  });

  it("Should fail to deserialise a record with an invalid POD name", () => {
    expect(() =>
      gpcPCDPrescribedPODValuesFromSimplifiedJSON(`{
        "$notPOD": { "entries": { "entry": 5 } }
      }`)
    ).to.throw(TypeError);
  });

  it("Should fail to deserialise a record with a POD with no data", () => {
    expect(() =>
      gpcPCDPrescribedPODValuesFromSimplifiedJSON(`{ "somePOD": {} }`)
    ).to.throw(TypeError);
  });

  it("Should fail to deserialise a record with a POD with an unexpected field", () => {
    expect(() =>
      gpcPCDPrescribedPODValuesFromSimplifiedJSON(`{
        "somePOD": { "privateKey": 0 }
      }`)
    ).to.throw(TypeError);
  });

  it("Should fail to deserialise a record with a POD with an invalid entry field", () => {
    expect(() =>
      gpcPCDPrescribedPODValuesFromSimplifiedJSON(`{
        "somePOD": { "entries": 55 }
      }`)
    ).to.throw(TypeError);
  });

  it("Should fail to deserialise a record with a POD with an invalid raw entry value", () => {
    expect(() =>
      gpcPCDPrescribedPODValuesFromSimplifiedJSON(`{
        "somePOD": { "entries": { "entry": {} } }
      }`)
    ).to.throw(TypeError);
  });

  it("Should fail to deserialise a record with a POD with an invalid signer's public key", () => {
    expect(() =>
      gpcPCDPrescribedPODValuesFromSimplifiedJSON(`{
        "somePOD": { "signerPublicKey": "33a" }
      }`)
    ).to.throw(TypeError);
  });
});
