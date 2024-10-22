import {
  EdDSATicketPCDPackage,
  EdDSATicketPCDTypeName,
  ITicketData,
  TicketCategory
} from "@pcd/eddsa-ticket-pcd";
import { ArgumentTypeName } from "@pcd/pcd-types";
import {
  SemaphoreIdentityPCDPackage,
  SemaphoreIdentityPCDTypeName
} from "@pcd/semaphore-identity-pcd";
import { Identity as IdentityV3 } from "@pcd/semaphore-identity-v3-wrapper";
import {
  EdDSATicketFieldsToReveal,
  ZKEdDSAEventTicketPCD,
  ZKEdDSAEventTicketPCDArgs,
  ZKEdDSAEventTicketPCDPackage
} from "@pcd/zk-eddsa-event-ticket-pcd";
import * as path from "path";
import { v4 as uuid } from "uuid";
import { TimerCase } from "../types";

const zkeyFilePath = path.join(
  __dirname,
  `../../../../pcd/zk-eddsa-event-ticket-pcd/artifacts/circuit.zkey`
);
const wasmFilePath = path.join(
  __dirname,
  `../../../../pcd/zk-eddsa-event-ticket-pcd/artifacts/circuit.wasm`
);

async function setupProveArgs(): Promise<ZKEdDSAEventTicketPCDArgs> {
  const identityV3 = new IdentityV3(
    '["329061722381819402313027227353491409557029289040211387019699013780657641967", "99353161014976810914716773124042455250852206298527174581112949561812190422"]'
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
    attendeeSemaphoreId: identityV3.getCommitment().toString(),
    isConsumed: false,
    isRevoked: false,
    ticketCategory: TicketCategory.Devconnect
  };

  const fieldsToReveal: EdDSATicketFieldsToReveal = {
    revealEventId: true,
    revealProductId: true
  };

  const validEventIdsContainingTicket: string[] = [
    uuid(),
    ticketData.eventId,
    uuid(),
    uuid()
  ];

  const identityPCD = await SemaphoreIdentityPCDPackage.prove({
    identityV3
  });

  const serializedIdentityPCD =
    await SemaphoreIdentityPCDPackage.serialize(identityPCD);

  const ticketPCD = await EdDSATicketPCDPackage.prove({
    ticket: {
      value: ticketData,
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

  const serializedTicketPCD = await EdDSATicketPCDPackage.serialize(ticketPCD);

  return {
    ticket: {
      value: serializedTicketPCD,
      argumentType: ArgumentTypeName.PCD,
      pcdType: EdDSATicketPCDTypeName
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
    validEventIds: {
      value: validEventIdsContainingTicket,
      argumentType: ArgumentTypeName.StringArray
    },
    externalNullifier: {
      value: EXTERNAL_NULLIFIER.toString(),
      argumentType: ArgumentTypeName.BigInt
    },
    watermark: {
      value: WATERMARK.toString(),
      argumentType: ArgumentTypeName.BigInt
    }
  };
}

export class ZKEdDSAEventTicketProveCase extends TimerCase {
  proveArgs?: ZKEdDSAEventTicketPCDArgs;

  constructor() {
    super("zk-eddsa-event-ticket-pcd.prove");
  }

  async init(): Promise<void> {
    await ZKEdDSAEventTicketPCDPackage.init?.({
      zkeyFilePath,
      wasmFilePath
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
    await ZKEdDSAEventTicketPCDPackage.prove(this.proveArgs);
  }
}

export class ZKEdDSAEventTicketVerifyCase extends TimerCase {
  pcd?: ZKEdDSAEventTicketPCD;

  constructor() {
    super("zk-eddsa-event-ticket-pcd.verify");
  }

  async init(): Promise<void> {
    await ZKEdDSAEventTicketPCDPackage.init?.({
      zkeyFilePath,
      wasmFilePath
    });
  }

  async setup(_: number): Promise<void> {
    this.pcd = await ZKEdDSAEventTicketPCDPackage.prove(await setupProveArgs());
  }

  async op(_: number): Promise<void> {
    if (!this.pcd) {
      throw new Error("Missing PCD.  Skipped setup?");
    }
    await ZKEdDSAEventTicketPCDPackage.verify(this.pcd);
  }
}
