import "mocha";
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="util/declarations/circomlibjs.d.ts" />

import { assert } from "chai";

// @ts-ignore
import { buildEddsa } from "circomlibjs";
// @ts-ignore
import { Scalar } from "ffjavascript";


const fromHexString = (hexString: string) => {
  // @ts-ignore
  return new Uint8Array(hexString?.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
}

const toHexString = (bytes: Uint8Array) =>
  bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');

describe("eddsa-pcd should work", function () {
  it("should be able to sign something using Circom", async function () {
    const eddsa = buildEddsa();

    const F = eddsa.babyJub.F;
    const prvKey = Buffer.from("0001020304050607080900010203040506070809000102030405060708090001", "hex");

    const msgBuf = fromHexString("000102030405060708090000");

    const msg = eddsa.babyJub.F.e(Scalar.fromRprLE(msgBuf, 0));


    const pubKey = eddsa.prv2pub(prvKey);

    assert(F.eq(pubKey[0], F.e("13277427435165878497778222415993513565335242147425444199013288855685581939618")));
    assert(F.eq(pubKey[1], F.e("13622229784656158136036771217484571176836296686641868549125388198837476602820")));

 
  });
});

