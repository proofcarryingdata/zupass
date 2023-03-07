import { Group } from "@semaphore-protocol/group";
import { Identity } from "@semaphore-protocol/identity";
import { generateProof, verifyProof } from "@semaphore-protocol/proof";

export class SemaphoreManager {
  private identities: Identity[] = [];

  public async test() {
    const identity = new Identity();
    this.identities.push(identity);

    console.log("identity", identity);

    const group = new Group(1, 16);
    const groupAddStart = performance.now();
    group.addMember(identity.commitment);
    const groupAddEnd = performance.now();

    console.log("group", group);
    console.log("took ", groupAddEnd - groupAddStart, "ms");

    const externalNullifier = group.root;
    const signal = 1;

    const proofStart = performance.now();
    const fullProof = await generateProof(
      identity,
      group,
      externalNullifier,
      signal,
      {
        zkeyFilePath: "./semaphore-artifacts/16.zkey",
        wasmFilePath: "./semaphore-artifacts/16.wasm",
      }
    );
    const proofEnd = performance.now();

    console.log("fullProof", fullProof);
    console.log("took ", proofEnd - proofStart, "ms");

    const verificationStart = performance.now();
    const verified = await verifyProof(fullProof, 16);
    const verificationEnd = performance.now();

    console.log("verified", verified);
    console.log("took ", verificationEnd - verificationStart, "ms");
  }
}
