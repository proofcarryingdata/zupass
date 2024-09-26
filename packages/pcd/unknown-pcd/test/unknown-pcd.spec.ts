import { ArgumentTypeName, SerializedPCD } from "@pcd/pcd-types";
import { assert, AssertionError, expect } from "chai";
import "mocha";
import { v4 as uuid } from "uuid";
import {
  init,
  isUnknownPCD,
  UnknownPCD,
  UnknownPCDPackage,
  UnknownPCDTypeName
} from "../src";

// TODO(artwyman): Move this to a test-util package shared with gpc
export async function expectAsyncError(
  fn: () => Promise<void>,
  typeName: string,
  errSubstring?: string
): Promise<void> {
  try {
    await fn();
    assert.fail("Expected an error to be thrown.");
  } catch (e: unknown) {
    if (e instanceof AssertionError || !(e instanceof Object)) {
      throw e;
    }
    expect(e.constructor.name).to.eq(typeName);
    if (errSubstring) {
      expect("" + e).to.contain(errSubstring);
    }
  }
}

const testSerializedPCD: SerializedPCD = {
  type: "some-pcd-type",
  pcd: "some-opaque-string"
};
const testUnknownPCD = new UnknownPCD(
  uuid(),
  testSerializedPCD,
  new Error("test UnknownPCD error")
);

describe("UnknownPCD Package", async function () {
  this.beforeEach(async () => {
    // Ensure running with default configuration unless the test overrides.
    init(undefined);
  });

  it("should be creatable using constructor", async function () {
    const id1 = uuid();
    const serializedPCD1: SerializedPCD = {
      type: "some-pcd-type1",
      pcd: "opaque1"
    };
    const pcd1 = new UnknownPCD(id1, serializedPCD1);
    expect(pcd1.type).to.eq(UnknownPCDTypeName);
    expect(isUnknownPCD(pcd1)).to.be.true;
    expect(pcd1.id).to.eq(id1);
    expect(pcd1.claim.serializedPCD).to.eq(serializedPCD1);
    expect(pcd1.proof.error).to.be.undefined;

    const id2 = uuid();
    const serializedPCD2: SerializedPCD = {
      type: "some-pcd-type2",
      pcd: "opaque2"
    };
    const err2 = new Error("2");
    const pcd2 = new UnknownPCD(id2, serializedPCD2, err2);
    expect(pcd1.type).to.eq(UnknownPCDTypeName);
    expect(isUnknownPCD(pcd1)).to.be.true;
    expect(pcd2.id).to.eq(id2);
    expect(pcd2.claim.serializedPCD).to.eq(serializedPCD2);
    expect(pcd2.proof.error).to.eq(err2);

    const pcd3 = new UnknownPCD(id1, serializedPCD1, 3);
    expect(pcd1.type).to.eq(UnknownPCDTypeName);
    expect(isUnknownPCD(pcd1)).to.be.true;
    expect(pcd3.id).to.eq(id1);
    expect(pcd3.claim.serializedPCD).to.eq(serializedPCD1);
    expect(pcd3.proof.error).to.eq(3);
  });

  it("should be creatable using prove", async function () {
    const serializedPCD1: SerializedPCD = {
      type: "some-pcd-type1",
      pcd: "opaque1"
    };
    const pcd1 = await UnknownPCDPackage.prove({
      serializedPCD: {
        value: serializedPCD1,
        argumentType: ArgumentTypeName.Object
      }
    });
    expect(pcd1.type).to.eq(UnknownPCDTypeName);
    expect(isUnknownPCD(pcd1)).to.be.true;
    expect(pcd1.id).to.not.be.undefined;
    expect(pcd1.claim.serializedPCD).to.eq(serializedPCD1);
    expect(pcd1.proof.error).to.be.undefined;
  });

  it("verify should behave as configured by init", async function () {
    if (UnknownPCDPackage.init === undefined) {
      assert.fail("init should be defined");
    }

    await UnknownPCDPackage.init(undefined);
    await expectAsyncError(
      async () => {
        await UnknownPCDPackage.verify(testUnknownPCD);
      },
      "Error",
      "test UnknownPCD error"
    );

    await UnknownPCDPackage.init({ verifyBehavior: undefined });
    await expectAsyncError(
      async () => {
        await UnknownPCDPackage.verify(testUnknownPCD);
      },
      "Error",
      "test UnknownPCD error"
    );

    await UnknownPCDPackage.init({ verifyBehavior: "error" });
    await expectAsyncError(
      async () => {
        await UnknownPCDPackage.verify(testUnknownPCD);
      },
      "Error",
      "test UnknownPCD error"
    );

    await UnknownPCDPackage.init({ verifyBehavior: "error" });
    await expectAsyncError(
      async () => {
        await UnknownPCDPackage.verify(
          new UnknownPCD(uuid(), testSerializedPCD, undefined)
        );
      },
      "Error",
      'UnknownPCD wrapping "some-pcd-type" cannot be validated.'
    );

    await UnknownPCDPackage.init({ verifyBehavior: "valid" });
    expect(await UnknownPCDPackage.verify(testUnknownPCD)).to.be.true;

    await UnknownPCDPackage.init({ verifyBehavior: "invalid" });
    expect(await UnknownPCDPackage.verify(testUnknownPCD)).to.be.false;
  });

  it("should serialize as wrapped PCD", async function () {
    expect(await UnknownPCDPackage.serialize(testUnknownPCD)).to.eq(
      testSerializedPCD
    );
  });

  it("should refuse to deserialize", async function () {
    await expectAsyncError(
      async () => {
        await UnknownPCDPackage.deserialize('{id: "whatever"}');
      },
      "Error",
      "UnknownPCD cannot be deserialized."
    );
  });

  it("should have display options", async function () {
    if (UnknownPCDPackage.getDisplayOptions === undefined) {
      assert.fail("getDisplayOptions should be defined");
    }

    const displayOptions = UnknownPCDPackage.getDisplayOptions(testUnknownPCD);
    expect(displayOptions.header).to.eq("Unknown PCD");
    expect(displayOptions.displayName).to.eq(
      "unknown-" + testSerializedPCD.type
    );
  });
});
