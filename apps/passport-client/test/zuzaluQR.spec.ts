import { decodeQRPayload, encodeQRPayload } from "@pcd/passport-ui";
import { assert, describe, it } from "vitest";

function makeTestPayload(length: number): string {
  let result = "";

  for (let i = 0; i < length; i++) {
    result += Math.floor(Math.random() * 10);
  }

  return result;
}

describe("QR Code", async function () {
  it("should encode and decode properly", async function () {
    const testPayload = makeTestPayload(1500);
    const encodedPayload = encodeQRPayload(testPayload);
    const decodedPayload = decodeQRPayload(encodedPayload);

    assert.equal(decodedPayload, testPayload);
  });
});
