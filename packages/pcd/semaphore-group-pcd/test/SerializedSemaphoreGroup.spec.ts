import { Group } from "@semaphore-protocol/group";
import { Identity } from "@semaphore-protocol/identity";
import assert from "assert";
import {
  deserializeSemaphoreGroup,
  serializeSemaphoreGroup
} from "../src/SerializedSemaphoreGroup";

describe("Serializing Semaphore groups", function () {
  it("should serialize and deserialize properly", async function () {
    const groupName = "GroupName";
    const originalGroup = new Group(1, 16);
    const identity = new Identity();
    originalGroup.addMember(identity.commitment);
    const serialized = serializeSemaphoreGroup(originalGroup, groupName);
    const deserialized = await deserializeSemaphoreGroup(serialized);

    assert.equal(deserialized.id, originalGroup.id);
    assert.deepEqual(deserialized.members, originalGroup.members);
    assert.equal(deserialized.root, originalGroup.root);
  });
});
