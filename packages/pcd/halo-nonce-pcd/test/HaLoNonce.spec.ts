/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { ArgumentTypeName } from "@pcd/pcd-types";
import assert from "assert";
import "mocha";
import { HaLoNoncePCDArgs, HaLoNoncePCDPackage } from "../src/HaLoNoncePCD";

describe("halo nonce PCD should work", function () {
  /**
   * Example URL from card
   *
   * https://halo.vrfy.ch/?av=A02.01.000090.9BFF4326&v=01.C5.000005.20F240F4&flags=00&
   * pk1=042468E24F59C3AEF25DC5D177878566A95783DDC473F2DAFD5E52FB746599D155E180BF6F69747C7DDDC2AD45EEB287208EF6978BCBA01A9F00930C1A98F100FE
   * &pk2=0471CC36704882589A6FF388D88B011E019739ACBC3502E668A4AE4D44B2EF7A3FEFA582CF4C67AA6EBF265B3E0CC47AEE6255DA3D9E55C14562805B132CC6FF9D
   * &rnd=00000002BB0A7B388734198E0B94EE9431C54FA820E97075CE67977CD9A91B00
   * &rndsig=3044022008626013151524BD93C205F7882AF81E2884B1AE6316417076E4A826BC00847302207C4C14488CF769D64D3736BA57266123EE5CF522EC3E673BEFF80D027C569B940471&cmd=0000&res=00
   */

  // sets up shared args across test cases
  let args: HaLoNoncePCDArgs;
  this.beforeAll(async function () {
    args = {
      pk2: {
        argumentType: ArgumentTypeName.String,
        value:
          "0471CC36704882589A6FF388D88B011E019739ACBC3502E668A4AE4D44B2EF7A3FEFA582CF4C67AA6EBF265B3E0CC47AEE6255DA3D9E55C14562805B132CC6FF9D"
      },
      rnd: {
        argumentType: ArgumentTypeName.String,
        value:
          "00000002BB0A7B388734198E0B94EE9431C54FA820E97075CE67977CD9A91B00"
      },
      rndsig: {
        argumentType: ArgumentTypeName.String,
        value:
          "3044022008626013151524BD93C205F7882AF81E2884B1AE6316417076E4A826BC00847302207C4C14488CF769D64D3736BA57266123EE5CF522EC3E673BEFF80D027C569B940471"
      }
    };
  });

  it("should be able to generate a PCD that verifies", async function () {
    const { prove, verify } = HaLoNoncePCDPackage;
    const pcd = await prove(args);
    const verified = await verify(pcd);
    assert.equal(verified, true);
  });

  it("should not verify a PCD with an incorrect nonce", async function () {
    const { prove, verify } = HaLoNoncePCDPackage;
    const pcd = await prove(args);
    pcd.claim.nonce += 1;
    const verified = await verify(pcd);
    assert.equal(verified, false);
  });

  it("should not verify a PCD with an incorrect pubkey", async function () {
    const { prove, verify } = HaLoNoncePCDPackage;
    const pcd = await prove(args);
    pcd.claim.pubkeyHex += "1";
    const verified = await verify(pcd);
    assert.equal(verified, false);
  });

  it("should not verify a proof with an incorrect proof", async function () {
    const { prove, verify } = HaLoNoncePCDPackage;
    const pcd = await prove(args);
    pcd.proof.signedDigest += "10";
    const verified = await verify(pcd);
    assert.equal(verified, false);
  });

  it("serializing and then deserializing a PCD should result in equal PCDs", async function () {
    const { prove, serialize, deserialize } = HaLoNoncePCDPackage;
    const pcd = await prove(args);
    const serialized_pcd = await serialize(pcd);
    const deserialized_pcd = await deserialize(serialized_pcd.pcd);
    assert.deepEqual(deserialized_pcd, pcd);
  });

  it("verifying a deserialized PCD that is valid should result in a correct verification", async function () {
    const { prove, verify, serialize, deserialize } = HaLoNoncePCDPackage;
    const pcd = await prove(args);
    const serialized_pcd = await serialize(pcd);
    const deserialized_pcd = await deserialize(serialized_pcd.pcd);
    const verified = await verify(deserialized_pcd);
    assert.equal(verified, true);
  });
});
