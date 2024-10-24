import { GPCProofConfig, proofConfigToJSON } from "@pcd/gpc";
import { GPCPCD, GPCPCDArgs, GPCPCDPackage } from "@pcd/gpc-pcd";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { POD, PODEntries } from "@pcd/pod";
import { PODPCD, PODPCDPackage } from "@pcd/pod-pcd";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { BABY_JUB_NEGATIVE_ONE } from "@pcd/util";
import { Identity } from "@semaphore-protocol/identity";
import path from "path";
import { v4 as uuid } from "uuid";
import { TimerCase } from "../types";

export const GPC_TEST_ARTIFACTS_PATH = path.join(
  __dirname,
  "../../../../lib/gpcircuits/artifacts/test"
);

async function setupProveArgs(): Promise<GPCPCDArgs> {
  // Key borrowed from https://github.com/iden3/circomlibjs/blob/4f094c5be05c1f0210924a3ab204d8fd8da69f49/test/eddsa.js#L103
  const privateKey = "AAECAwQFBgcICQABAgMEBQYHCAkAAQIDBAUGBwgJAAE"; // hex 0001020304050607080900010203040506070809000102030405060708090001

  const ownerIdentity = new Identity(
    '["329061722381819402313027227353491409557029289040211387019699013780657641967", "99353161014976810914716773124042455250852206298527174581112949561812190422"]'
  );

  // 11 entries, max depth 5
  // Defined out of order, but will be sorted by POD construction.
  const sampleEntries = {
    E: { type: "cryptographic", value: 123n },
    F: { type: "cryptographic", value: BABY_JUB_NEGATIVE_ONE },
    C: { type: "string", value: "hello" },
    D: { type: "string", value: "foobar" },
    A: { type: "int", value: 123n },
    B: { type: "int", value: 321n },
    G: { type: "int", value: 7n },
    H: { type: "int", value: 8n },
    I: { type: "int", value: 9n },
    J: { type: "int", value: 10n },
    owner: { type: "cryptographic", value: ownerIdentity.commitment }
  } satisfies PODEntries;

  const proofConfig: GPCProofConfig = {
    pods: {
      pod0: {
        entries: {
          A: { isRevealed: true },
          E: { isRevealed: false, equalsEntry: "pod0.A" },
          owner: { isRevealed: false, isOwnerID: "SemaphoreV3" }
        }
      }
    }
  };

  const pod = POD.sign(sampleEntries, privateKey);
  const podPCD = new PODPCD(uuid(), pod);

  const identityPCD = await SemaphoreIdentityPCDPackage.prove({
    identityV3: ownerIdentity
  });

  return {
    proofConfig: {
      argumentType: ArgumentTypeName.Object,
      value: proofConfigToJSON(proofConfig)
    },
    pods: {
      value: {
        pod0: {
          value: await PODPCDPackage.serialize(podPCD),
          argumentType: ArgumentTypeName.PCD
        }
      },
      argumentType: ArgumentTypeName.RecordContainer
    },
    identity: {
      value: await SemaphoreIdentityPCDPackage.serialize(identityPCD),
      argumentType: ArgumentTypeName.PCD
    },
    externalNullifier: {
      value: "some external nullifier",
      argumentType: ArgumentTypeName.Object
    },
    watermark: {
      value: "some watermark",
      argumentType: ArgumentTypeName.Object
    },
    id: {
      argumentType: ArgumentTypeName.String,
      value: uuid()
    },
    membershipLists: {
      argumentType: ArgumentTypeName.Object
    }
  } satisfies GPCPCDArgs;
}

export class GPCPCDProveCase extends TimerCase {
  proveArgs?: GPCPCDArgs;

  constructor() {
    super("gpc-pcd.prove");
  }

  async init(): Promise<void> {
    await GPCPCDPackage.init?.({ zkArtifactPath: GPC_TEST_ARTIFACTS_PATH });
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async setup(_: number): Promise<void> {
    this.proveArgs = await setupProveArgs();
  }

  async op(_: number): Promise<void> {
    if (!this.proveArgs) {
      throw new Error("Missing proveArgs.  Skipped setup?");
    }
    await GPCPCDPackage.prove(this.proveArgs);
  }
}

export class GPCPCDVerifyCase extends TimerCase {
  pcd?: GPCPCD;

  constructor() {
    super("gpc-pcd.verify");
  }

  async init(): Promise<void> {
    await GPCPCDPackage.init?.({ zkArtifactPath: GPC_TEST_ARTIFACTS_PATH });
  }

  async setup(_: number): Promise<void> {
    this.pcd = await GPCPCDPackage.prove(await setupProveArgs());
  }

  async op(_: number): Promise<void> {
    if (!this.pcd) {
      throw new Error("Missing PCD.  Skipped setup?");
    }
    await GPCPCDPackage.verify(this.pcd);
  }
}
