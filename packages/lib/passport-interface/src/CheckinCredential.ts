import { EmailPCD, EmailPCDPackage } from "@pcd/email-pcd";
import { SerializedPCD } from "@pcd/pcd-types";
import {
  SemaphoreSignaturePCD,
  SemaphoreSignaturePCDPackage
} from "@pcd/semaphore-signature-pcd";

/*
 * The payload encoded in the message of the SemaphoreSignaturePCD passed
 * as a credential to the checkin api within the Generic Issuance backend.
 */
export interface GenericCheckinCredentialPayload {
  emailPCD: SerializedPCD<EmailPCD>;
  ticketIdToCheckIn: string;
  eventId: string;
  timestamp: number;
}

/**
 * After verification, return the unserialized Email PCD.
 */
export interface VerifiedCheckinCredential {
  emailPCD: EmailPCD;
  ticketIdToCheckIn: string;
  eventId: string;
}

/**
 * Creates a credential payload for use in the Generic Issuance checkin API.
 */
export function createGenericCheckinCredentialPayload(
  emailPCD: SerializedPCD<EmailPCD>,
  ticketId: string,
  eventId: string
): GenericCheckinCredentialPayload {
  return {
    emailPCD: emailPCD,
    ticketIdToCheckIn: ticketId,
    eventId,
    timestamp: Date.now()
  };
}

/**
 * When checking tickets in, the user submits a payload wrapped in a Semaphore
 * signature.
 */
export async function verifyCheckinCredential(
  credential: SerializedPCD<SemaphoreSignaturePCD>
): Promise<VerifiedCheckinCredential> {
  const signaturePCD = await SemaphoreSignaturePCDPackage.deserialize(
    credential.pcd
  );
  const signaturePCDValid =
    await SemaphoreSignaturePCDPackage.verify(signaturePCD);

  if (!signaturePCDValid) {
    throw new Error("Invalid signature");
  }

  const payload: GenericCheckinCredentialPayload = JSON.parse(
    signaturePCD.claim.signedMessage
  );

  // TODO in the feed credential verification, we also check the timestamp
  // Do we need to do this here?

  const emailPCD = await EmailPCDPackage.deserialize(payload.emailPCD.pcd);
  if (!(await EmailPCDPackage.verify(emailPCD))) {
    throw new Error("Invalid email PCD");
  }

  return {
    emailPCD,
    ticketIdToCheckIn: payload.ticketIdToCheckIn,
    eventId: payload.eventId
  };
}
