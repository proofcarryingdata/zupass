import { EmailPCD, EmailPCDPackage } from "@pcd/email-pcd";
import { SerializedPCD } from "@pcd/pcd-types";
import {
  SemaphoreSignaturePCD,
  SemaphoreSignaturePCDPackage
} from "@pcd/semaphore-signature-pcd";

export interface PodboxTicketAction {
  checkin?: {
    ticketId: string;
  };
  shareContact?: {
    recipientTicketId: string;
  };
  giftBadge?: {
    recipientTicketId: string;
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
  action: PodboxTicketAction;

  /**
   * The email pcd proving their membership in the pipeline.
   */
  emailPCD: SerializedPCD<EmailPCD>;

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
  action: PodboxTicketAction,
  eventId: string
): TicketActionPayload {
  return {
    emailPCD,
    action,
    eventId,
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
