import { EdDSAPCD, EdDSAPCDPackage } from "@pcd/eddsa-pcd";
import { PCDCrypto } from "@pcd/passport-crypto";
import { ZupassUserJson } from "@pcd/passport-interface";
import { PCDCollection } from "@pcd/pcd-collection";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { Identity } from "@semaphore-protocol/identity";
import { expect } from "chai";
import { v4 as uuid } from "uuid";
import { randomEmail } from "../src/util";
import { ValidationErrors, validateAppState } from "../src/validateState";

function newEdSAPCD(): Promise<EdDSAPCD> {
  return EdDSAPCDPackage.prove({
    message: {
      value: ["0x12345", "0x54321", "0xdeadbeef"],
      argumentType: ArgumentTypeName.StringArray
    },
    privateKey: {
      value: "0001020304050607080900010203040506070809000102030405060708090001",
      argumentType: ArgumentTypeName.String
    },
    id: {
      value: undefined,
      argumentType: ArgumentTypeName.String
    }
  });
}

describe("validateAppState", async function () {
  const crypto = await PCDCrypto.newInstance();
  const pcdPackages = [SemaphoreIdentityPCDPackage, EdDSAPCDPackage];

  it("validateState returns no errors on valid logged out state", async function () {
    const errors = validateAppState("test", undefined, undefined, undefined);
    expect(errors.errors.length).to.eq(0);
    expect(errors.userUUID).to.eq(undefined);
  });

  it("validateState returns errors for logged out state with invalid PCD collections", async function () {
    expect(
      validateAppState(
        "test",
        undefined,
        undefined,
        await (async () => {
          return new PCDCollection(pcdPackages);
        })(),
        true
      )
    ).to.deep.eq({
      errors: [
        "'pcds' contains no pcds",
        "'pcds' field in app state does not contain an identity PCD"
      ],
      userUUID: undefined
    } satisfies ValidationErrors);

    expect(
      validateAppState(
        "test",
        undefined,
        undefined,
        await (async () => {
          const collection = new PCDCollection(pcdPackages);
          collection.add(await newEdSAPCD());
          return collection;
        })(),
        true
      )
    ).to.deep.eq({
      errors: ["'pcds' field in app state does not contain an identity PCD"],
      userUUID: undefined
    } satisfies ValidationErrors);

    expect(
      validateAppState("test", undefined, undefined, undefined, true)
    ).to.deep.eq({
      errors: [
        "'pcds' field in app state does not contain an identity PCD",
        "missing 'pcds'"
      ],
      userUUID: undefined
    } satisfies ValidationErrors);
  });

  it("validateState returns no errors on valid logged in state", async function () {
    const identity = new Identity();
    const saltAndEncryptionKey = await crypto.generateSaltAndEncryptionKey(
      "testpassword123!@#asdf"
    );
    const self: ZupassUserJson = {
      commitment: identity.commitment.toString(),
      email: randomEmail(),
      salt: saltAndEncryptionKey.salt,
      terms_agreed: 1,
      uuid: uuid()
    };
    const pcds = new PCDCollection(pcdPackages);
    pcds.add(
      await SemaphoreIdentityPCDPackage.prove({
        identity
      })
    );
    const errors = validateAppState("test", self, identity, pcds);
    expect(errors.errors.length).to.eq(0);
    expect(errors.userUUID).to.eq(self.uuid);
  });

  it("validateState returns errors for situation where the pcd collection is empty", async function () {
    const identity = new Identity();
    const saltAndEncryptionKey = await crypto.generateSaltAndEncryptionKey(
      "testpassword123!@#asdf"
    );
    const self: ZupassUserJson = {
      commitment: identity.commitment.toString(),
      email: randomEmail(),
      salt: saltAndEncryptionKey.salt,
      terms_agreed: 1,
      uuid: uuid()
    };
    const pcds = new PCDCollection(pcdPackages);
    // deliberately create empty pcd collection
    const errors = validateAppState("test", self, identity, pcds);
    expect(errors.errors).to.deep.eq([
      "'pcds' contains no pcds",
      "'pcds' field in app state does not contain an identity PCD"
    ]);
    expect(errors.userUUID).to.eq(self.uuid);
  });
});
