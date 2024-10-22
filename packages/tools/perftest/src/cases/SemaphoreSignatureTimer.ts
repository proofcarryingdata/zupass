import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { Identity as IdentityV3 } from "@pcd/semaphore-identity-v3-wrapper";
import {
  SemaphoreSignaturePCD,
  SemaphoreSignaturePCDArgs,
  SemaphoreSignaturePCDPackage
} from "@pcd/semaphore-signature-pcd";
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
  const identityV3 = new IdentityV3();
  const identityPCD = await SemaphoreIdentityPCDPackage.serialize(
    await SemaphoreIdentityPCDPackage.prove({ identityV3 })
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
  async setup(_: number): Promise<void> {
    this.proveArgs = await setupProveArgs();
  }

  async op(_: number): Promise<void> {
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

  async setup(_: number): Promise<void> {
    this.pcd = await SemaphoreSignaturePCDPackage.prove(await setupProveArgs());
  }

  async op(_: number): Promise<void> {
    if (!this.pcd) {
      throw new Error("Missing PCD.  Skipped setup?");
    }
    await SemaphoreSignaturePCDPackage.verify(this.pcd);
  }
}
