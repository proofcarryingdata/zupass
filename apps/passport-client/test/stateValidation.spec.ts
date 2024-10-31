import { EdDSAPCD, EdDSAPCDPackage } from "@pcd/eddsa-pcd";
import { PCDCrypto } from "@pcd/passport-crypto";
import { ZupassUserJson } from "@pcd/passport-interface";
import { PCDCollection } from "@pcd/pcd-collection";
import { ArgumentTypeName } from "@pcd/pcd-types";
import {
  SemaphoreIdentityPCDPackage,
  v3tov4Identity,
  v4PublicKey
} from "@pcd/semaphore-identity-pcd";
import { Identity } from "@semaphore-protocol/identity";
import { v4 as uuid } from "uuid";
import { describe, expect, it } from "vitest";
import { randomEmail } from "../src/util";
import { ErrorReport, validateRunningAppState } from "../src/validateState";

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
  const saltAndEncryptionKey = await crypto.generateSaltAndEncryptionKey(
    "testpassword123!@#asdf"
  );
  const pcdPackages = [SemaphoreIdentityPCDPackage, EdDSAPCDPackage];
  const identity1 = new Identity(
    '["0xaa5fa3165e1ca129bd7a2b3bada18c5f81350faacf2edff59cf44eeba2e2d",' +
      '"0xa944ed90153fc2be5759a0d18eda47266885aea0966ef4dbb96ff979c29ed4"]'
  );
  const v4id1 = v3tov4Identity(identity1);
  const commitment1 = identity1.commitment;
  const identity2 = new Identity(
    '["0x8526e030dbd593833f24bf73b60f0bcc58690c590b9953acc741f2eb71394d",' +
      '"0x520e4ae6f5d5e4526dd517e61defe16f90bd4aef72b41394285e77463e0c69"]'
  );
  const v4id2 = v3tov4Identity(identity2);
  const commitment2 = identity2.commitment;
  const identity3 = new Identity(
    '["0x4837c6f88904d1dfefcb7dc6486e95c06cda6eb76d76a9888167c0993e40f0",' +
      '"0x956f9e03b0cc324045d24f9b20531e547272fab8e8ee2f96c0cf2e50311468"]'
  );

  it("logged out ; no errors", async function () {
    expect(
      validateRunningAppState(TAG_STR, undefined, undefined, undefined)
    ).to.deep.eq({
      errors: [],
      userUUID: undefined,
      ...TAG
    } satisfies ErrorReport);
  });

  it("logged out ; forceCheckPCDs=true; test of all error states", async function () {
    expect(
      validateRunningAppState(
        TAG_STR,
        undefined,
        undefined,
        new PCDCollection(pcdPackages),
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
      validateRunningAppState(
        TAG_STR,
        undefined,
        undefined,
        await (async (): Promise<PCDCollection> => {
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

    const pcds = new PCDCollection(pcdPackages);
    pcds.add(
      await SemaphoreIdentityPCDPackage.prove({
        identityV3: identity1
      })
    );
    expect(
      validateRunningAppState(TAG_STR, undefined, undefined, pcds, true)
    ).to.deep.eq({
      errors: [],
      userUUID: undefined,
      ...TAG
    } satisfies ErrorReport);

    expect(
      validateRunningAppState(TAG_STR, undefined, undefined, undefined, true)
    ).to.deep.eq({
      errors: [
        "missing 'pcds'",
        "'pcds' field in app state does not contain an identity PCD"
      ],
      userUUID: undefined,
      ...TAG
    } satisfies ErrorReport);
  });

  it("logged in ; pre semaphore v4 migration ; no errors", async function () {
    const self: ZupassUserJson = {
      commitment: identity1.commitment.toString(),
      emails: [randomEmail()],
      salt: saltAndEncryptionKey.salt,
      terms_agreed: 1,
      uuid: uuid()
    };
    let pcds = new PCDCollection(pcdPackages);
    pcds.add(
      await SemaphoreIdentityPCDPackage.prove({
        identityV3: identity1
      })
    );
    expect(validateRunningAppState(TAG_STR, self, identity1, pcds)).to.deep.eq({
      userUUID: self.uuid,
      errors: [],
      ...TAG
    } satisfies ErrorReport);

    // Extra identity PCD comes second and is ignored.
    pcds.add(
      await SemaphoreIdentityPCDPackage.prove({
        identityV3: identity2
      })
    );
    expect(validateRunningAppState(TAG_STR, self, identity1, pcds)).to.deep.eq({
      userUUID: self.uuid,
      errors: [],
      ...TAG
    } satisfies ErrorReport);

    // Extra identity PCD comes first and is ignored.
    pcds = new PCDCollection(pcdPackages);
    pcds.add(
      await SemaphoreIdentityPCDPackage.prove({
        identityV3: identity2
      })
    );
    pcds.add(
      await SemaphoreIdentityPCDPackage.prove({
        identityV3: identity1
      })
    );
    expect(validateRunningAppState(TAG_STR, self, identity1, pcds)).to.deep.eq({
      userUUID: self.uuid,
      errors: [],
      ...TAG
    } satisfies ErrorReport);
  });

  it("logged in ; empty pcd collection ; pre semaphore v4 migration ; errors", async function () {
    const self: ZupassUserJson = {
      commitment: identity1.commitment.toString(),
      emails: [randomEmail()],
      salt: saltAndEncryptionKey.salt,
      terms_agreed: 1,
      uuid: uuid()
    };
    const pcds = new PCDCollection(pcdPackages);
    expect(validateRunningAppState(TAG_STR, self, identity1, pcds)).to.deep.eq({
      userUUID: self.uuid,
      errors: [
        "'pcds' contains no pcds",
        "'pcds' field in app state does not contain an identity PCD"
      ],
      ...TAG
    } satisfies ErrorReport);
  });

  it("logged in ; missing pcd collection ; pre semaphore v4 migration ; errors", async function () {
    const self: ZupassUserJson = {
      commitment: identity1.commitment.toString(),
      emails: [randomEmail()],
      salt: saltAndEncryptionKey.salt,
      terms_agreed: 1,
      uuid: uuid()
    };
    expect(
      validateRunningAppState(TAG_STR, self, identity1, undefined)
    ).to.deep.eq({
      userUUID: self.uuid,
      errors: [
        "missing 'pcds'",
        "'pcds' field in app state does not contain an identity PCD"
      ],
      ...TAG
    } satisfies ErrorReport);
  });

  it("logged in ; missing identity ; pre semaphore v4 migration ; errors", async function () {
    const self: ZupassUserJson = {
      commitment: identity1.commitment.toString(),
      emails: [randomEmail()],
      salt: saltAndEncryptionKey.salt,
      terms_agreed: 1,
      uuid: uuid()
    };
    const pcds = new PCDCollection(pcdPackages);
    pcds.add(
      await SemaphoreIdentityPCDPackage.prove({
        identityV3: identity1
      })
    );
    expect(validateRunningAppState(TAG_STR, self, undefined, pcds)).to.deep.eq({
      userUUID: self.uuid,
      errors: ["missing v3 identity from state"],
      ...TAG
    } satisfies ErrorReport);
  });

  it("logged in ; self missing commitment ; pre semaphore v4 migration ; errors", async function () {
    const self: ZupassUserJson = {
      // Missing commitment field
      emails: [randomEmail()],
      salt: saltAndEncryptionKey.salt,
      terms_agreed: 1,
      uuid: uuid()
    } as ZupassUserJson; // Type assertion allows missing commitment
    const pcds = new PCDCollection(pcdPackages);
    pcds.add(
      await SemaphoreIdentityPCDPackage.prove({
        identityV3: identity1
      })
    );
    expect(validateRunningAppState(TAG_STR, self, identity1, pcds)).to.deep.eq({
      userUUID: self.uuid,
      errors: ["'self' missing a v3 commitment"],
      ...TAG
    } satisfies ErrorReport);
  });

  it("logged in ; self commitment wrong ; pre semaphore v4 migration ; errors", async function () {
    const self: ZupassUserJson = {
      commitment: identity2.commitment.toString(),
      emails: [randomEmail()],
      salt: saltAndEncryptionKey.salt,
      terms_agreed: 1,
      uuid: uuid()
    };
    const pcds = new PCDCollection(pcdPackages);
    pcds.add(
      await SemaphoreIdentityPCDPackage.prove({
        identityV3: identity1
      })
    );
    expect(validateRunningAppState(TAG_STR, self, identity1, pcds)).to.deep.eq({
      userUUID: self.uuid,
      errors: [
        `commitment of identity pcd in collection (${commitment1}) does not match commitment in 'self' field of app state (${commitment2})`,
        `commitment in 'self' field of app state (${commitment2}) does not match commitment of 'identity' field of app state (${commitment1})`
      ],
      ...TAG
    } satisfies ErrorReport);
  });

  it("logged in ; pcd collection identity wrong ; pre semaphore v4 migration ; errors", async function () {
    const self: ZupassUserJson = {
      commitment: identity1.commitment.toString(),
      emails: [randomEmail()],
      salt: saltAndEncryptionKey.salt,
      terms_agreed: 1,
      uuid: uuid()
    };
    const pcds = new PCDCollection(pcdPackages);
    pcds.add(
      await SemaphoreIdentityPCDPackage.prove({
        identityV3: identity2
      })
    );
    expect(validateRunningAppState(TAG_STR, self, identity1, pcds)).to.deep.eq({
      userUUID: self.uuid,
      errors: [
        `commitment of identity pcd in collection (${commitment2}) does not match commitment in 'self' field of app state (${commitment1})`,
        `commitment of 'identity' field of app state (${commitment1}) does not match commitment of identity pcd in collection (${commitment2})`
      ],
      ...TAG
    } satisfies ErrorReport);
  });

  it("logged in ; appState identity wrong ; pre semaphore v4 migration ; errors", async function () {
    const self: ZupassUserJson = {
      commitment: identity1.commitment.toString(),
      emails: [randomEmail()],
      salt: saltAndEncryptionKey.salt,
      terms_agreed: 1,
      uuid: uuid()
    };
    const pcds = new PCDCollection(pcdPackages);
    pcds.add(
      await SemaphoreIdentityPCDPackage.prove({
        identityV3: identity1
      })
    );
    expect(validateRunningAppState(TAG_STR, self, identity2, pcds)).to.deep.eq({
      userUUID: self.uuid,
      errors: [
        `commitment in 'self' field of app state (${identity1.commitment.toString()}) does not match commitment of 'identity' field of app state (${identity2.commitment.toString()})`,
        `commitment of 'identity' field of app state (${identity2.commitment.toString()}) does not match commitment of identity pcd in collection (${identity1.commitment.toString()})`
      ],
      ...TAG
    } satisfies ErrorReport);
  });

  it("logged in ; all identities mistmatched ; pre semaphore v4 migration ; errors", async function () {
    const self: ZupassUserJson = {
      commitment: identity1.commitment.toString(),
      emails: [randomEmail()],
      salt: saltAndEncryptionKey.salt,
      terms_agreed: 1,
      uuid: uuid()
    };
    const pcds = new PCDCollection(pcdPackages);
    pcds.add(
      await SemaphoreIdentityPCDPackage.prove({
        identityV3: identity2
      })
    );
    expect(validateRunningAppState(TAG_STR, self, identity3, pcds)).to.deep.eq({
      userUUID: self.uuid,
      errors: [
        `commitment of identity pcd in collection (${identity2.commitment.toString()}) does not match commitment in 'self' field of app state (${identity1.commitment.toString()})`,
        `commitment in 'self' field of app state (${identity1.commitment.toString()}) does not match commitment of 'identity' field of app state (${identity3.commitment.toString()})`,
        `commitment of 'identity' field of app state (${identity3.commitment.toString()}) does not match commitment of identity pcd in collection (${identity2.commitment.toString()})`
      ],
      ...TAG
    } satisfies ErrorReport);
  });

  it("logged in ; partially applied semaphore v4 migration ; errors", async function () {
    const self: ZupassUserJson = {
      commitment: identity1.commitment.toString(),
      // semaphore_v4_commitment: v4id1.commitment.toString(), - missing
      semaphore_v4_pubkey: v4PublicKey(v4id1),
      emails: [randomEmail()],
      salt: saltAndEncryptionKey.salt,
      terms_agreed: 1,
      uuid: uuid()
    };
    const pcds = new PCDCollection(pcdPackages);
    pcds.add(
      await SemaphoreIdentityPCDPackage.prove({
        identityV3: identity1
      })
    );
    expect(validateRunningAppState(TAG_STR, self, identity1, pcds)).to.deep.eq({
      userUUID: self.uuid,
      errors: [
        "missing 'semaphore_v4_commitment' from 'self'. either both 'semaphore_v4_commitment' and 'semaphore_v4_pubkey' must be present, or neither must be present."
      ],
      ...TAG
    } satisfies ErrorReport);
  });

  it("logged in ; another partially applied semaphore v4 migration ; errors", async function () {
    const self: ZupassUserJson = {
      commitment: identity1.commitment.toString(),
      semaphore_v4_commitment: v4id1.commitment.toString(),
      // semaphore_v4_pubkey: v4PublicKey(v4id1), - missing
      emails: [randomEmail()],
      salt: saltAndEncryptionKey.salt,
      terms_agreed: 1,
      uuid: uuid()
    };
    const pcds = new PCDCollection(pcdPackages);
    pcds.add(
      await SemaphoreIdentityPCDPackage.prove({
        identityV3: identity1
      })
    );
    expect(validateRunningAppState(TAG_STR, self, identity1, pcds)).to.deep.eq({
      userUUID: self.uuid,
      errors: [
        "missing 'semaphore_v4_pubkey' from 'self'. either both 'semaphore_v4_commitment' and 'semaphore_v4_pubkey' must be present, or neither must be present."
      ],
      ...TAG
    } satisfies ErrorReport);
  });

  it("logged in ; mismatched v4 commitment post-migration ; errors", async function () {
    const self: ZupassUserJson = {
      commitment: identity1.commitment.toString(),
      semaphore_v4_commitment: v4id2.commitment.toString(), // this one is wrong
      semaphore_v4_pubkey: v4PublicKey(v4id1),
      emails: [randomEmail()],
      salt: saltAndEncryptionKey.salt,
      terms_agreed: 1,
      uuid: uuid()
    };
    const pcds = new PCDCollection(pcdPackages);
    pcds.add(
      await SemaphoreIdentityPCDPackage.prove({
        identityV3: identity1
      })
    );
    expect(validateRunningAppState(TAG_STR, self, identity1, pcds)).to.deep.eq({
      userUUID: self.uuid,
      errors: [
        `v4 commitment in self (${
          self.semaphore_v4_commitment
        }) does not match v4 commitment of identity in pcd collection (${v4id1.commitment.toString()})`
      ],
      ...TAG
    } satisfies ErrorReport);
  });

  it("logged in ; another mismatched v4 public key post-migration ; errors", async function () {
    const self: ZupassUserJson = {
      commitment: identity1.commitment.toString(),
      semaphore_v4_commitment: v4id1.commitment.toString(), // this one is wrong
      semaphore_v4_pubkey: v4PublicKey(v4id2),
      emails: [randomEmail()],
      salt: saltAndEncryptionKey.salt,
      terms_agreed: 1,
      uuid: uuid()
    };
    const pcds = new PCDCollection(pcdPackages);
    pcds.add(
      await SemaphoreIdentityPCDPackage.prove({
        identityV3: identity1
      })
    );
    expect(validateRunningAppState(TAG_STR, self, identity1, pcds)).to.deep.eq({
      userUUID: self.uuid,
      errors: [
        `v4 public key in self (${
          self.semaphore_v4_pubkey
        }) does not match v4 public key of identity in pcd collection (${v4PublicKey(
          v4id1
        )})`
      ],
      ...TAG
    } satisfies ErrorReport);
  });

  it("logged in ; mismatched v4 public key AND commitment post-migration ; errors", async function () {
    const self: ZupassUserJson = {
      commitment: identity1.commitment.toString(),
      semaphore_v4_commitment: v4id2.commitment.toString(), // this one is wrong
      semaphore_v4_pubkey: v4PublicKey(v4id2), // this one is ALSO wrong
      emails: [randomEmail()],
      salt: saltAndEncryptionKey.salt,
      terms_agreed: 1,
      uuid: uuid()
    };
    const pcds = new PCDCollection(pcdPackages);
    pcds.add(
      await SemaphoreIdentityPCDPackage.prove({
        identityV3: identity1
      })
    );
    expect(validateRunningAppState(TAG_STR, self, identity1, pcds)).to.deep.eq({
      userUUID: self.uuid,
      errors: [
        `v4 commitment in self (${
          self.semaphore_v4_commitment
        }) does not match v4 commitment of identity in pcd collection (${v4id1.commitment.toString()})`,
        `v4 public key in self (${
          self.semaphore_v4_pubkey
        }) does not match v4 public key of identity in pcd collection (${v4PublicKey(
          v4id1
        )})`
      ],
      ...TAG
    } satisfies ErrorReport);
  });
});

const TAG_STR = "test";
const TAG = { tag: TAG_STR };
