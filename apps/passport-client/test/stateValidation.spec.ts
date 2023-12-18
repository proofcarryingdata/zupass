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
import { ErrorReport, validateAppState } from "../src/validateState";

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

  it("logged out ; no errors", async function () {
    const errors = validateAppState(TAG_STR, undefined, undefined, undefined);
    expect(errors.errors.length).to.eq(0);
    expect(errors.userUUID).to.eq(undefined);
  });

  it("logged out ; forceCheckPCDs=true; all error states caught", async function () {
    expect(
      validateAppState(
        TAG_STR,
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
      userUUID: undefined,
      ...TAG
    } satisfies ErrorReport);

    expect(
      validateAppState(
        TAG_STR,
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
      userUUID: undefined,
      ...TAG
    } satisfies ErrorReport);

    expect(
      validateAppState(TAG_STR, undefined, undefined, undefined, true)
    ).to.deep.eq({
      errors: [
        "missing 'pcds'",
        "'pcds' field in app state does not contain an identity PCD"
      ],
      userUUID: undefined,
      ...TAG
    } satisfies ErrorReport);
  });

  it("logged in ; no errors", async function () {
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
    expect(validateAppState(TAG_STR, self, identity, pcds)).to.deep.eq({
      userUUID: self.uuid,
      errors: [],
      ...TAG
    } satisfies ErrorReport);
  });

  it("logged in ; empty pcd collection ; errors", async function () {
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
    expect(validateAppState(TAG_STR, self, identity, pcds)).to.deep.eq({
      userUUID: self.uuid,
      errors: [
        "'pcds' contains no pcds",
        "'pcds' field in app state does not contain an identity PCD"
      ],
      ...TAG
    } satisfies ErrorReport);
  });

  it("logged in ; missing pcd collection ; errors", async function () {
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
    expect(validateAppState(TAG_STR, self, identity, undefined)).to.deep.eq({
      userUUID: self.uuid,
      errors: [
        "missing 'pcds'",
        "'pcds' field in app state does not contain an identity PCD"
      ],
      ...TAG
    } satisfies ErrorReport);
  });

  it("logged in ; missing identity ; errors", async function () {
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
    expect(validateAppState(TAG_STR, self, undefined, pcds)).to.deep.eq({
      userUUID: self.uuid,
      errors: ["missing 'identity'"],
      ...TAG
    } satisfies ErrorReport);
  });
});

const TAG_STR = "test";
const TAG = { tag: TAG_STR };
