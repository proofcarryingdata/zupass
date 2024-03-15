import { EmailPCD, EmailPCDPackage } from "@pcd/email-pcd";
import { SerializedPCD } from "@pcd/pcd-types";
import {
  SemaphoreSignaturePCD,
  SemaphoreSignaturePCDPackage
} from "@pcd/semaphore-signature-pcd";

export interface ZuboxTicketAction {
  checkin?: boolean;
  getContact?: boolean;
  giftBadge?: {
    badgeIds: string[];
  };
}

/*
 * The payload encoded in the message of the SemaphoreSignaturePCD passed
 * as a credential to the checkin api within the Generic Issuance backend.
 */
export interface TicketActionPayload {
  /**
   * The action a member of a pipeline wants to take.
   */
  action: ZuboxTicketAction;

  /**
   * The email pcd proving their membership in the pipeline.
   */
  emailPCD: SerializedPCD<EmailPCD>;

  ticketId: string;
  eventId: string;
  timestamp: number;
}

/**
 * After verification, return the unserialized Email PCD.
 */
export interface VerifiedTicketActionCredential {
  emailPCD: EmailPCD;
  ticketIdToCheckIn: string;
  eventId: string;
}

/**
 * Creates a credential payload for use in the Generic Issuance checkin API.
 */
export function createTicketActionCredentialPayload(
  emailPCD: SerializedPCD<EmailPCD>,
  action: ZuboxTicketAction,
  eventId: string,
  ticketId: string
): TicketActionPayload {
  return {
    emailPCD,
    action,
    eventId,
    ticketId,
    timestamp: Date.now()
  };
}

/**
 * When checking tickets in, the user submits a payload wrapped in a Semaphore
 * signature.
 */
export async function verifyTicketActionCredential(
  credential: SerializedPCD<SemaphoreSignaturePCD>
): Promise<TicketActionPayload> {
  const signaturePCD = await SemaphoreSignaturePCDPackage.deserialize(
    credential.pcd
  );
  const signaturePCDValid =
    await SemaphoreSignaturePCDPackage.verify(signaturePCD);

  if (!signaturePCDValid) {
    throw new Error("Invalid signature");
  }

  const payload: TicketActionPayload = JSON.parse(
    signaturePCD.claim.signedMessage
  );

  // TODO in the feed credential verification, we also check the timestamp
  // Do we need to do this here?

  const emailPCD = await EmailPCDPackage.deserialize(payload.emailPCD.pcd);
  if (!(await EmailPCDPackage.verify(emailPCD))) {
    throw new Error("Invalid email PCD");
  }

  return payload;
}
