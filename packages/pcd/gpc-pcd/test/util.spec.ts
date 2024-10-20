import { expect } from "chai";
import {
  FixedPODEntries,
  fixedPODEntriesFromJSON,
  fixedPODEntriesToJSON
} from "../src";

describe("PODEntryRecord serialisation should work", () => {
  it("Should serialise and deserialise empty object", async function () {
    const serialised = JSON.stringify(fixedPODEntriesToJSON({}));
    const expectedSerialised = "{}";
    const deserialised = fixedPODEntriesFromJSON(JSON.parse(serialised));
    expect(serialised).to.eq(expectedSerialised);
    expect(deserialised).to.deep.eq({});
  });

  it("Should serialise and deserialise record containing typical POD data", () => {
    const typicalPrescribedEntries: FixedPODEntries = {
      pod1: {
        ticketID: { type: "cryptographic", value: 5558n },
        eventID: { type: "string", value: "some-event-id" }
      },
      pod2: {
        hp: { type: "int", value: 55n }
      }
    };

    const serialised = JSON.stringify(
      fixedPODEntriesToJSON(typicalPrescribedEntries)
    );

    const expectedSerialised = JSON.stringify({
      pod1: {
        ticketID: { cryptographic: 5558 },
        eventID: "some-event-id"
      },
      pod2: {
        hp: 55
      }
    });

    const deserialised = fixedPODEntriesFromJSON(JSON.parse(serialised));

    expect(serialised).to.eq(expectedSerialised);
    expect(deserialised).to.deep.eq(typicalPrescribedEntries);
  });

  it("Should fail to deserialise a string not representing an object", () => {
    expect(() => fixedPODEntriesFromJSON(JSON.parse(`"hello"`))).to.throw(
      TypeError
    );
  });

  it("Should fail to deserialise a record with an invalid POD name", () => {
    expect(() =>
      fixedPODEntriesFromJSON(
        JSON.parse(`{
        "$notPOD": { "entry": 5 }
      }`)
      )
    ).to.throw(TypeError);
  });

  it("Should fail to deserialise a record with a POD with an invalid entry value", () => {
    expect(() =>
      fixedPODEntriesFromJSON(
        JSON.parse(`{
        "somePOD": { "entry": {} }
      }`)
      )
    ).to.throw(TypeError);
  });
});
