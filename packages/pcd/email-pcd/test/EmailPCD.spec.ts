import { ArgumentTypeName } from "@pcd/pcd-types";
import { expect } from "chai";
import "mocha";
import { EmailPCD, EmailPCDPackage } from "../src/index.js";

describe("EdDSA attested email should work", function () {
  let emailPCD: EmailPCD;
  let stableEmailPCD: EmailPCD;

  // Key borrowed from https://github.com/iden3/circomlibjs/blob/4f094c5be05c1f0210924a3ab204d8fd8da69f49/test/eddsa.js#L103
  const prvKey =
    "0001020304050607080900010203040506070809000102030405060708090001";
  const emailAddress = "user@test.com";
  const semaphoreId = "12345";
  const otherEmail = "someuser@example.com";
  const otherSemaphoreID = "42";
  const stableId = "attested-email-" + otherEmail;

  this.beforeAll(async () => {
    emailPCD = await EmailPCDPackage.prove({
      emailAddress: {
        value: emailAddress,
        argumentType: ArgumentTypeName.String
      },
      semaphoreId: {
        value: semaphoreId,
        argumentType: ArgumentTypeName.String
      },
      privateKey: {
        value: prvKey,
        argumentType: ArgumentTypeName.String
      },
      id: {
        value: undefined,
        argumentType: ArgumentTypeName.String
      }
    });
  });

  it("should reflect prove args", async function () {
    expect(emailPCD.claim.emailAddress).to.eq(emailAddress);
    expect(emailPCD.claim.semaphoreId).to.eq(semaphoreId);
    expect(emailPCD.id).to.not.be.empty;
  });

  it("should be able to create and verify a signed email", async function () {
    expect(await EmailPCDPackage.verify(emailPCD)).to.be.true;
  });

  it("should be possible to serialize and deserialize the pcd", async function () {
    const serialized = await EmailPCDPackage.serialize(emailPCD);
    const deserialized = await EmailPCDPackage.deserialize(serialized.pcd);
    expect(deserialized).to.deep.eq(emailPCD);
  });

  it("should accept stable ID", async function () {
    stableEmailPCD = await EmailPCDPackage.prove({
      emailAddress: {
        value: otherEmail,
        argumentType: ArgumentTypeName.String
      },
      semaphoreId: {
        value: otherSemaphoreID,
        argumentType: ArgumentTypeName.String
      },
      privateKey: {
        value: prvKey,
        argumentType: ArgumentTypeName.String
      },
      id: {
        value: stableId,
        argumentType: ArgumentTypeName.String
      }
    });

    expect(stableEmailPCD.id).to.eq(stableId);
    expect(stableEmailPCD.claim.emailAddress).to.eq(otherEmail);
    expect(stableEmailPCD.claim.semaphoreId).to.eq(otherSemaphoreID);

    const serialized = await EmailPCDPackage.serialize(stableEmailPCD);
    const deserialized = await EmailPCDPackage.deserialize(serialized.pcd);
    expect(deserialized).to.deep.eq(stableEmailPCD);
  });

  it("should be identical with same stable ID", async function () {
    const stableEmailPCD2 = await EmailPCDPackage.prove({
      emailAddress: {
        value: otherEmail,
        argumentType: ArgumentTypeName.String
      },
      semaphoreId: {
        value: otherSemaphoreID,
        argumentType: ArgumentTypeName.String
      },
      privateKey: {
        value: prvKey,
        argumentType: ArgumentTypeName.String
      },
      id: {
        value: stableId,
        argumentType: ArgumentTypeName.String
      }
    });

    expect(stableEmailPCD2.id).to.eq(stableId);
    expect(stableEmailPCD2.claim.emailAddress).to.eq(otherEmail);
    expect(stableEmailPCD2.claim.semaphoreId).to.eq(otherSemaphoreID);
    expect(stableEmailPCD2).to.deep.eq(stableEmailPCD);

    const serialized1 = await EmailPCDPackage.serialize(stableEmailPCD);
    const serialized2 = await EmailPCDPackage.serialize(stableEmailPCD2);
    expect(serialized1).to.deep.eq(serialized2);
    const deserialized1 = await EmailPCDPackage.deserialize(serialized1.pcd);
    const deserialized2 = await EmailPCDPackage.deserialize(serialized2.pcd);
    expect(deserialized2).to.deep.eq(deserialized1);
  });
});
