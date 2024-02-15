import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import {
  SemaphoreSignaturePCD,
  SemaphoreSignaturePCDArgs,
  SemaphoreSignaturePCDPackage
} from "@pcd/semaphore-signature-pcd";
import { Identity } from "@semaphore-protocol/identity";
import * as path from "path";
import { TimerCase } from "../types";

const zkeyFilePath = path.join(
  __dirname,
  `../../../../pcd/semaphore-signature-pcd/artifacts/16.zkey`
);
const wasmFilePath = path.join(
  __dirname,
  `../../../../pcd/semaphore-signature-pcd/artifacts/16.wasm`
);

async function setupProveArgs(): Promise<SemaphoreSignaturePCDArgs> {
  const identity = new Identity();
  const identityPCD = await SemaphoreIdentityPCDPackage.serialize(
    await SemaphoreIdentityPCDPackage.prove({ identity })
  );

  return {
    identity: {
      argumentType: ArgumentTypeName.PCD,
      pcdType: SemaphoreIdentityPCDPackage.name,
      value: identityPCD
    },
    signedMessage: {
      argumentType: ArgumentTypeName.String,
      value: "Test message"
    }
  };
}

export class SemaphoreSignatureProveCase extends TimerCase {
  proveArgs?: SemaphoreSignaturePCDArgs;

  constructor() {
    super("semaphore-signature-pcd.prove");
  }

  async init(): Promise<void> {
    await SemaphoreSignaturePCDPackage.init?.({ zkeyFilePath, wasmFilePath });
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async setup(): Promise<void> {
    this.proveArgs = await setupProveArgs();
  }

  async op(): Promise<void> {
    if (!this.proveArgs) {
      throw new Error("Missing proveArgs.  Skipped setup?");
    }
    await SemaphoreSignaturePCDPackage.prove(this.proveArgs);
  }
}

export class SemaphoreSignatureVerifyCase extends TimerCase {
  pcd?: SemaphoreSignaturePCD;

  constructor() {
    super("semaphore-signature-pcd.verify");
  }

  async init(): Promise<void> {
    await SemaphoreSignaturePCDPackage.init?.({ zkeyFilePath, wasmFilePath });
  }

  async setup(): Promise<void> {
    this.pcd = await SemaphoreSignaturePCDPackage.prove(await setupProveArgs());
  }

  async op(): Promise<void> {
    if (!this.pcd) {
      throw new Error("Missing PCD.  Skipped setup?");
    }
    await SemaphoreSignaturePCDPackage.verify(this.pcd);
  }
}
