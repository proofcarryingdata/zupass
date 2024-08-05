import {
  EdDSATicketPCD,
  EdDSATicketPCDArgs,
  EdDSATicketPCDPackage,
  ITicketData,
  TicketCategory
} from "@pcd/eddsa-ticket-pcd";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { v4 as uuid } from "uuid";
import { TimerCase } from "../types.js";

// Key borrowed from https://github.com/iden3/circomlibjs/blob/4f094c5be05c1f0210924a3ab204d8fd8da69f49/test/eddsa.js#L103
export const prvKey =
  "0001020304050607080900010203040506070809000102030405060708090001";

export const ticketData: ITicketData = {
  // the fields below are not signed and are used for display purposes

  attendeeName: "test name",
  attendeeEmail: "user@test.com",
  eventName: "event",
  ticketName: "ticket",
  checkerEmail: "checker@test.com",

  // the fields below are signed using the server's private eddsa key

  ticketId: uuid(),
  eventId: uuid(),
  productId: uuid(),
  timestampConsumed: Date.now(),
  timestampSigned: Date.now(),
  attendeeSemaphoreId: "12345",
  isConsumed: false,
  isRevoked: false,
  ticketCategory: TicketCategory.Devconnect
};

export const proveArgs: EdDSATicketPCDArgs = {
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
};

export class EdDSATicketProveCase extends TimerCase {
  constructor() {
    super("eddsa-ticket-pcd.prove");
  }

  async init(): Promise<void> {
    await EdDSATicketPCDPackage.init?.({});
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async setup(_: number): Promise<void> {}

  async op(_: number): Promise<void> {
    await EdDSATicketPCDPackage.prove(proveArgs);
  }
}

export class EdDSATicketVerifyCase extends TimerCase {
  pcd?: EdDSATicketPCD;

  constructor() {
    super("eddsa-ticket-pcd.verify");
  }

  async init(): Promise<void> {
    await EdDSATicketPCDPackage.init?.({});
  }

  async setup(_: number): Promise<void> {
    this.pcd = await EdDSATicketPCDPackage.prove(proveArgs);
  }

  async op(_: number): Promise<void> {
    if (!this.pcd) {
      throw new Error("Missing PCD.  Skipped setup?");
    }
    await EdDSATicketPCDPackage.verify(this.pcd);
  }
}
