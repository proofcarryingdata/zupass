import { ArgumentTypeName } from "@pcd/pcd-types";
import { POD, PODContent, podEntriesToJSON } from "@pcd/pod";
import { PODEntries, PODPCD, PODPCDArgs, PODPCDPackage } from "@pcd/pod-pcd";
import { BABY_JUB_NEGATIVE_ONE } from "@pcd/util";
import { TimerCase } from "../types";

// Key borrowed from https://github.com/iden3/circomlibjs/blob/4f094c5be05c1f0210924a3ab204d8fd8da69f49/test/eddsa.js#L103
export const privateKey = "AAECAwQFBgcICQABAgMEBQYHCAkAAQIDBAUGBwgJAAE"; // hex 0001020304050607080900010203040506070809000102030405060708090001

export const sampleEntries = {
  E: { type: "cryptographic", value: 123n },
  F: { type: "cryptographic", value: BABY_JUB_NEGATIVE_ONE },
  C: { type: "string", value: "hello" },
  D: { type: "string", value: "foobar" },
  A: { type: "int", value: 123n },
  B: { type: "int", value: 321n },
  G: { type: "int", value: 7n },
  H: { type: "int", value: 8n },
  I: { type: "int", value: 9n },
  J: { type: "int", value: 10n }
} satisfies PODEntries;

export const proveArgs: PODPCDArgs = {
  entries: {
    value: podEntriesToJSON(sampleEntries),
    argumentType: ArgumentTypeName.Object
  },
  privateKey: {
    value: privateKey,
    argumentType: ArgumentTypeName.String
  },
  id: {
    value: undefined,
    argumentType: ArgumentTypeName.String
  }
};

export class PODProveCase extends TimerCase {
  constructor() {
    super("pod-pcd.prove");
  }

  async init(): Promise<void> {
    await PODPCDPackage.init?.({});
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async setup(_: number): Promise<void> {}

  async op(_: number): Promise<void> {
    await PODPCDPackage.prove(proveArgs);
  }
}

export class PODVerifyCase extends TimerCase {
  pcds: PODPCD[];

  constructor() {
    super("pod-pcd.verify");
    this.pcds = [];
  }

  async init(): Promise<void> {
    await PODPCDPackage.init?.({});
  }

  async setup(iterationCount: number): Promise<void> {
    // Separate PCD per iteraton shows perf without caching of derived data
    const samplePOD = POD.sign(sampleEntries, privateKey);
    for (let i = 0; i < iterationCount; i++) {
      this.pcds.push(
        // Reconstituting each PCD from saved data means verificaton will
        // need to rebuild derived data.
        new PODPCD(
          i.toString(),
          POD.load(
            samplePOD.content.asEntries(),
            samplePOD.signature,
            samplePOD.signerPublicKey
          )
        )
      );
    }
  }

  async op(iteration: number): Promise<void> {
    if (!this.pcds || iteration >= this.pcds.length) {
      throw new Error("Missing PCD.  Skipped setup?");
    }
    await PODPCDPackage.verify(this.pcds[iteration]);
  }
}

export class PODGetMerkleTreeCase extends TimerCase {
  constructor() {
    super("pod-pcd.getMerkleTree");
  }

  async init(): Promise<void> {
    await PODPCDPackage.init?.({});
  }

  async setup(_: number): Promise<void> {}

  async op(_: number): Promise<void> {
    const podContent = PODContent.fromEntries(sampleEntries);
    // Ensure that we use the contentID somehow
    if (podContent.contentID === undefined) {
      throw new Error("Missing contentID");
    }
  }
}
