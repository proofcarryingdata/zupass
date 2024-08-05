import { expect } from "chai";
import JSONBig from "json-bigint";
import {
  FixedPODEntries,
  fixedPODEntriesFromSimplifiedJSON,
  fixedPODEntriesToSimplifiedJSON
} from "../src/index.js";

const jsonBigSerializer = JSONBig({
  useNativeBigInt: true,
  alwaysParseAsBig: true
});

describe("PODEntryRecord serialisation should work", () => {
  it("Should serialise and deserialise empty object", async function () {
    const serialised = fixedPODEntriesToSimplifiedJSON({});
    const expectedSerialised = "{}";
    const deserialised = fixedPODEntriesFromSimplifiedJSON(serialised);
    expect(serialised).to.eq(expectedSerialised);
    expect(deserialised).to.deep.eq({});
  });

  it("Should serialise and deserialise record containing typical POD data", () => {
    const typicalPrescribedEntries: FixedPODEntries = {
      pod1: {
        ticketID: { type: "int", value: 5558n },
        eventID: { type: "int", value: 0n }
      },
      pod2: {
        hp: { type: "int", value: 55n }
      }
    };

    const serialised = fixedPODEntriesToSimplifiedJSON(
      typicalPrescribedEntries
    );

    const expectedSerialised = jsonBigSerializer.stringify({
      pod1: {
        ticketID: 5558n,
        eventID: 0n
      },
      pod2: {
        hp: 55n
      }
    });

    const deserialised = fixedPODEntriesFromSimplifiedJSON(serialised);

    expect(serialised).to.eq(expectedSerialised);
    expect(deserialised).to.deep.eq(typicalPrescribedEntries);
  });

  it("Should fail to deserialise a string not representing an object", () => {
    expect(() => fixedPODEntriesFromSimplifiedJSON(`"hello"`)).to.throw(
      TypeError
    );
  });

  it("Should fail to deserialise a record with an invalid POD name", () => {
    expect(() =>
      fixedPODEntriesFromSimplifiedJSON(`{
        "$notPOD": { "entry": 5 }
      }`)
    ).to.throw(TypeError);
  });

  it("Should fail to deserialise a record with a POD with no data", () => {
    expect(() =>
      fixedPODEntriesFromSimplifiedJSON(`{ "somePOD": {} }`)
    ).to.throw(TypeError);
  });

  it("Should fail to deserialise a record with a POD with an invalid raw entry value", () => {
    expect(() =>
      fixedPODEntriesFromSimplifiedJSON(`{
        "somePOD": { "entry": {} }
      }`)
    ).to.throw(TypeError);
  });
});
