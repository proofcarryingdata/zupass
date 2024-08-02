import {
  EdDSATicketPCDTypeName,
  ITicketData,
  TicketCategory
} from "@pcd/eddsa-ticket-pcd";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { PODTicketPCDPackage } from "@pcd/pod-ticket-pcd";
import {
  SemaphoreIdentityPCDPackage,
  SemaphoreIdentityPCDTypeName
} from "@pcd/semaphore-identity-pcd";
import {
  PODTicketFieldsToReveal,
  ZKPODTicketPCD,
  ZKPODTicketPCDArgs,
  ZKPODTicketPCDPackage
} from "@pcd/zk-pod-ticket-pcd";
import { Identity } from "@semaphore-protocol/identity";
import * as path from "path";
import { TimerCase } from "../types";

const GPC_NPM_ARTIFACTS_PATH = path.join(
  __dirname,
  "../../../../../node_modules/@pcd/proto-pod-gpc-artifacts"
);

async function setupProveArgs(): Promise<ZKPODTicketPCDArgs> {
  const identity = new Identity(
    '["3290617223818194023130272273534914095557029289040211387019699013780657641967", "9935316101497681091471677312404245525085220629852717458112949561812190422"]'
  );

  // Key borrowed from https://github.com/iden3/circomlibjs/blob/4f094c5be05c1f0210924a3ab204d8fd8da69f49/test/eddsa.js#L103
  const prvKey =
    "0001020304050607080900010203040506070809000102030405060708090001";

  const WATERMARK = 6n;
  const EXTERNAL_NULLIFIER = 42n;

  const ticketData: ITicketData = {
    // the fields below are not signed and are used for display purposes

    attendeeName: "test name",
    attendeeEmail: "user@test.com",
    eventName: "event",
    ticketName: "ticket",
    checkerEmail: "checker@test.com",

    // the fields below are signed using the server's private eddsa key

    ticketId: "b38501b0-cf66-4416-a4ef-631a9a9b32c4",
    eventId: "4332f16c-8444-4261-94b9-a0ba8ca917e2",
    productId: "c94002fb-2c41-480b-842d-fa826fb517e5",
    timestampConsumed: 0,
    timestampSigned: 1693028498280,
    attendeeSemaphoreId: identity.getCommitment().toString(),
    isConsumed: false,
    isRevoked: false,
    ticketCategory: TicketCategory.Devconnect
  };

  const fieldsToReveal: PODTicketFieldsToReveal = {
    revealEventId: true,
    revealProductId: true
  };

  const identityPCD = await SemaphoreIdentityPCDPackage.prove({
    identity: identity
  });

  const serializedIdentityPCD =
    await SemaphoreIdentityPCDPackage.serialize(identityPCD);

  const ticketPCD = await PODTicketPCDPackage.prove({
    ticket: {
      value: ticketData,
      argumentType: ArgumentTypeName.Object
    },
    extraEntries: {
      value: {},
      argumentType: ArgumentTypeName.Object
    },
    privateKey: {
      value: prvKey,
      argumentType: ArgumentTypeName.String
    },
    id: {
      value: undefined,
      argumentType: ArgumentTypeName.String
    }
  });

  const serializedTicketPCD = await PODTicketPCDPackage.serialize(ticketPCD);

  return {
    ticket: {
      value: serializedTicketPCD,
      argumentType: ArgumentTypeName.PCD,
      pcdType: EdDSATicketPCDTypeName,
      validatorParams: {
        ticketPatterns: [
          {
            signerPublicKey: ticketPCD.claim.signerPublicKey,
            events: [
              {
                id: ticketData.eventId,
                productIds: [ticketData.productId]
              }
            ]
          }
        ],
        notFoundMessage: "ticket not found"
      }
    },
    identity: {
      value: serializedIdentityPCD,
      argumentType: ArgumentTypeName.PCD,
      pcdType: SemaphoreIdentityPCDTypeName
    },
    fieldsToReveal: {
      value: fieldsToReveal,
      argumentType: ArgumentTypeName.ToggleList
    },
    revealSignerPublicKey: {
      value: true,
      argumentType: ArgumentTypeName.Boolean
    },
    externalNullifier: {
      value: EXTERNAL_NULLIFIER.toString(),
      argumentType: ArgumentTypeName.String
    },
    watermark: {
      value: WATERMARK.toString(),
      argumentType: ArgumentTypeName.String
    }
  };
}

export class ZKPODTicketProveCase extends TimerCase {
  proveArgs?: ZKPODTicketPCDArgs;
  first: boolean = true;

  constructor() {
    super("zk-pod-ticket-pcd.prove");
  }

  async init(): Promise<void> {
    await ZKPODTicketPCDPackage.init?.({
      zkArtifactPath: GPC_NPM_ARTIFACTS_PATH
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async setup(_: number): Promise<void> {
    this.proveArgs = await setupProveArgs();
  }

  async op(_: number): Promise<void> {
    if (!this.proveArgs) {
      throw new Error("Missing proveArgs.  Skipped setup?");
    }
    const result = await ZKPODTicketPCDPackage.prove(this.proveArgs);
    if (this.first) {
      console.log(
        `Proving using circuit: ${result.claim.config.circuitIdentifier}`
      );
      this.first = false;
    }
  }
}

export class ZKPODTicketVerifyCase extends TimerCase {
  pcd?: ZKPODTicketPCD;

  constructor() {
    super("zk-pod-ticket-pcd.verify");
  }

  async init(): Promise<void> {
    await ZKPODTicketPCDPackage.init?.({
      zkArtifactPath: GPC_NPM_ARTIFACTS_PATH
    });
  }

  async setup(_: number): Promise<void> {
    this.pcd = await ZKPODTicketPCDPackage.prove(await setupProveArgs());
  }

  async op(_: number): Promise<void> {
    if (!this.pcd) {
      throw new Error("Missing PCD.  Skipped setup?");
    }
    await ZKPODTicketPCDPackage.verify(this.pcd);
  }
}
