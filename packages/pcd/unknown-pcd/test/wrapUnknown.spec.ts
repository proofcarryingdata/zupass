import { SerializedPCD } from "@pcd/pcd-types";
import { expect } from "chai";
import "mocha";
import {
  derivePCDID,
  init,
  PCD_ID_MAX_LENGTH,
  UnknownPCDPackage,
  wrapUnknownPCD
} from "../src";

describe("UnknownPCD wrapping", async function () {
  this.beforeEach(async () => {
    // Ensure running with default configuration unless the test overrides.
    init(undefined);
  });

  it("should wrap properly", async function () {
    const serializedPCD: SerializedPCD = {
      type: "some-type",
      pcd: "some-body"
    };
    const err = new Error("something happened");
    const unknownPCD = wrapUnknownPCD(serializedPCD, err);
    expect(unknownPCD.type).to.eq(UnknownPCDPackage.name);
    expect(unknownPCD.claim.serializedPCD).to.deep.eq(serializedPCD);
    expect(unknownPCD.proof.error).to.eq(err);
  });

  it("should derive stable IDs from input", async function () {
    const TEST_INOUT = [
      ["", "2be7e62d-cd24-5576-8fe0-39c621cb4c40"],
      ["123", "e66c6343-ab9e-5ccd-ac90-10b37466851c"],
      ["{asfadf", "5c138a2a-e463-54c0-b488-51de2683a367"],
      ["{}", "b395734c-691b-5f98-8735-ee07f1f1a2fd"],
      ['{"hello": "world"}', "8094dfa4-3739-5fb0-82ae-38fdfe18e6a5"],
      ['{"hello": "world", "id": "found-id1"}', "found-id1"],
      ['{"hello": "world", "id": "found-id2", "number": 123.456}', "found-id2"],
      [
        '{"hello": "world", "id": "found-id3", "bigint": 123456789012345678901234567890}',
        "found-id3"
      ],
      [
        '{"hello": "world", "id": "found-id-too-big' +
          new Array(PCD_ID_MAX_LENGTH).join("X") +
          '", "bigint": 123456789012345678901234567890}',
        "b4f9aae0-8e03-5f6d-a0b1-cbe3f2be7863"
      ]
    ];

    for (const [serializedString, foundID] of TEST_INOUT) {
      const serializedPCD: SerializedPCD = {
        type: "some-type",
        pcd: serializedString
      };
      expect(derivePCDID(serializedPCD)).eq(foundID);
      const unknownPCD = wrapUnknownPCD(serializedPCD);
      expect(unknownPCD.id).to.eq(foundID);
    }
  });

  it("should derive IDs from unparsable PCDs", async function () {
    const goodPODPCD = {
      type: "pod-pcd",
      pcd: '{"id":"fb2506c6-f5a0-422f-bdf4-2ccb20d6372a","claim":{"entries":{"A":{"type":"int","value":123},"B":{"type":"int","value":321},"C":{"type":"string","value":"hello"},"D":{"type":"string","value":"foobar"},"E":{"type":"int","value":123},"F":{"type":"int","value":4294967295},"G":{"type":"int","value":7},"H":{"type":"int","value":8},"I":{"type":"int","value":9},"J":{"type":"int","value":10},"K":{"type":"int","value":-5},"owner":{"type":"cryptographic","value":18711405342588116796533073928767088921854096266145046362753928030796553161041},"ownerV4":{"type":"eddsa_pubkey","value":"1nsPGF66uuDfBnpQD+7o/9SPX7L0JDn+lubKh+QGuS8"}},"signerPublicKey":"xDP3ppa3qjpSJO+zmTuvDM2eku7O4MKaP2yCCKnoHZ4"},"proof":{"signature":"8TR4BbBLtjYcbxHGyzDyZarZJYJeYhBXtQiASkvmRaRcmCwMOxaj0zFTYgN3s7Jt2Gz5qleQxWI+TapAB42ABQ"}}'
    } satisfies SerializedPCD;
    expect(derivePCDID(goodPODPCD)).to.eq(
      "fb2506c6-f5a0-422f-bdf4-2ccb20d6372a"
    );

    // One of the types has been replaced by "some-unexpected-type" to make
    // this an unparsable POD.
    const badPODPCD = {
      type: "pod-pcd",
      pcd: '{"id":"fb2506c6-f5a0-422f-bdf4-2ccb20d6372a","claim":{"entries":{"A":{"type":"some-unexpected-type","value":123},"B":{"type":"int","value":321},"C":{"type":"string","value":"hello"},"D":{"type":"string","value":"foobar"},"E":{"type":"int","value":123},"F":{"type":"int","value":4294967295},"G":{"type":"int","value":7},"H":{"type":"int","value":8},"I":{"type":"int","value":9},"J":{"type":"int","value":10},"K":{"type":"int","value":-5},"owner":{"type":"cryptographic","value":18711405342588116796533073928767088921854096266145046362753928030796553161041},"ownerV4":{"type":"eddsa_pubkey","value":"1nsPGF66uuDfBnpQD+7o/9SPX7L0JDn+lubKh+QGuS8"}},"signerPublicKey":"xDP3ppa3qjpSJO+zmTuvDM2eku7O4MKaP2yCCKnoHZ4"},"proof":{"signature":"8TR4BbBLtjYcbxHGyzDyZarZJYJeYhBXtQiASkvmRaRcmCwMOxaj0zFTYgN3s7Jt2Gz5qleQxWI+TapAB42ABQ"}}'
    } satisfies SerializedPCD;
    expect(derivePCDID(badPODPCD)).to.eq(
      "fb2506c6-f5a0-422f-bdf4-2ccb20d6372a"
    );
  });
});
