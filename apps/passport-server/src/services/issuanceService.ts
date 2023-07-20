import { getHash } from "@pcd/passport-crypto";
import {
  CheckInRequest,
  CheckInResponse,
  ISSUANCE_STRING,
  IssuedPCDsRequest,
  IssuedPCDsResponse
} from "@pcd/passport-interface";
import { ArgumentTypeName, SerializedPCD } from "@pcd/pcd-types";
import { RSAPCDPackage } from "@pcd/rsa-pcd";
import {
  getPublicKey,
  getTicketData,
  ITicketData,
  RSATicketPCDPackage
} from "@pcd/rsa-ticket-pcd";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import NodeRSA from "node-rsa";
import { fetchCommitmentByPublicCommitment } from "../database/queries/commitments";
import { fetchDevconnectPretixTicketsByEmail } from "../database/queries/devconnect_pretix_tickets/fetchDevconnectPretixTicket";
import { consumeDevconnectPretixTicket } from "../database/queries/devconnect_pretix_tickets/updateDevconnectPretixTicket";
import { ApplicationContext } from "../types";
import { logger } from "../util/logger";

export class IssuanceService {
  private readonly context: ApplicationContext;
  private readonly rsaPrivateKey: NodeRSA;
  private readonly exportedPrivateKey: string;
  private readonly exportedPublicKey: string;

  public constructor(context: ApplicationContext, rsaPrivateKey: NodeRSA) {
    this.context = context;
    this.rsaPrivateKey = rsaPrivateKey;
    this.exportedPrivateKey = this.rsaPrivateKey.exportKey("private");
    this.exportedPublicKey = this.rsaPrivateKey.exportKey("public");
  }

  public getPublicKey(): string {
    return this.exportedPublicKey;
  }

  public async handleIssueRequest(
    request: IssuedPCDsRequest
  ): Promise<IssuedPCDsResponse> {
    const pcds = await this.issueDevconnectPretixTicketPCDs(request);
    return { pcds };
  }

  public async handleCheckInRequest(
    request: CheckInRequest
  ): Promise<CheckInResponse> {
    try {
      const ticketPCD = await RSATicketPCDPackage.deserialize(
        request.ticket.pcd
      );
      const { ticketId } = getTicketData(ticketPCD);
      if (!ticketId) {
        throw new Error("ticketId field not found in rsaPCD");
      }
      const proofPublicKey = getPublicKey(ticketPCD)?.exportKey("public");
      if (!proofPublicKey) {
        throw new Error("failed to get public key from proof");
      }
      const serverPublicKey = this.getPublicKey();

      if (serverPublicKey !== proofPublicKey) {
        throw new Error("ticket was not signed with the right key");
      }

      const successfullyConsumed = await consumeDevconnectPretixTicket(
        this.context.dbPool,
        parseInt(ticketId, 10)
      );

      if (successfullyConsumed) {
        return {
          success: true
        };
      }

      logger(
        "Ticket either does not exist, has already been consumed, or has been revoked"
      );
      return {
        success: false
      };
    } catch (e) {
      logger("Error when consuming devconnect ticket", { error: e });
      throw new Error("failed to check in");
    }
  }

  private async getUserEmailFromRequest(
    request: IssuedPCDsRequest
  ): Promise<string | null> {
    const deserializedSignature =
      await SemaphoreSignaturePCDPackage.deserialize(request.userProof.pcd);
    const isValid = await SemaphoreSignaturePCDPackage.verify(
      deserializedSignature
    );
    if (!isValid) {
      logger(
        `can't issue PCDs for ${deserializedSignature.claim.identityCommitment} because ` +
          `the requester's PCD didn't verify`
      );
      return null;
    }

    if (deserializedSignature.claim.signedMessage !== ISSUANCE_STRING) {
      // TODO: implement a challenge-response protocol? How secure is this?
      logger(`can't issue PCDs, wrong message signed by user`);
      return null;
    }

    const requestingFor = deserializedSignature.claim.identityCommitment;
    const storedCommitment = await fetchCommitmentByPublicCommitment(
      this.context.dbPool,
      requestingFor
    );

    if (storedCommitment == null) {
      logger(
        `can't issue PCDs for ${deserializedSignature.claim.identityCommitment} because ` +
          `we don't have a user with that commitment in the database`
      );
      return null;
    }

    return storedCommitment.email;
  }

  private async ticketDataToSerializedPCD(
    ticketData: ITicketData
  ): Promise<SerializedPCD> {
    const serializedTicketData = JSON.stringify(ticketData);
    const stableId = await getHash("issued-ticket-" + ticketData.ticketId);

    const rsaPcd = await RSAPCDPackage.prove({
      privateKey: {
        argumentType: ArgumentTypeName.String,
        value: this.exportedPrivateKey
      },
      signedMessage: {
        argumentType: ArgumentTypeName.String,
        value: serializedTicketData
      },
      id: {
        argumentType: ArgumentTypeName.String,
        value: undefined
      }
    });

    const rsaTicketPCD = await RSATicketPCDPackage.prove({
      id: {
        argumentType: ArgumentTypeName.String,
        value: stableId
      },
      rsaPCD: {
        argumentType: ArgumentTypeName.PCD,
        value: await RSAPCDPackage.serialize(rsaPcd)
      }
    });

    const serializedTicketPCD = await RSATicketPCDPackage.serialize(
      rsaTicketPCD
    );

    return serializedTicketPCD;
  }

  /**
   * Fetch all DevconnectPretixTicket entities under a given user's email.
   */
  private async issueDevconnectPretixTicketPCDs(
    request: IssuedPCDsRequest
  ): Promise<SerializedPCD[]> {
    const email = await this.getUserEmailFromRequest(request);

    if (email == null) {
      return [];
    }

    const ticketsDB = await fetchDevconnectPretixTicketsByEmail(
      this.context.dbPool,
      email
    );

    const serializedPCDs = await Promise.all(
      ticketsDB
        // convert to ITicketData
        .map(
          (t) =>
            ({
              ticketId: t.id.toString(),
              eventName: t.event_name,
              ticketName: t.item_name,
              timestamp: Date.now(),
              attendeeEmail: email,
              attendeeName: t.full_name,
              isConsumed: t.is_consumed,
              isRevoked: t.is_deleted,
              eventConfigId: t.pretix_events_config_id
            }) satisfies ITicketData
        )
        // convert to serialized ticket PCD
        .map((ticketData) => this.ticketDataToSerializedPCD(ticketData))
    );

    return serializedPCDs;
  }
}

export function startIssuanceService(
  context: ApplicationContext
): IssuanceService | null {
  if (context.isZuzalu) {
    logger("[INIT] not starting issuance service for zuzalu");
    return null;
  }

  const pkey = loadPrivateKey();

  if (pkey == null) {
    logger("[INIT] can't start issuance service, missing private key");
    return null;
  }

  const issuanceService = new IssuanceService(context, pkey);
  return issuanceService;
}

function loadPrivateKey(): NodeRSA | null {
  const pkeyEnv = process.env.SERVER_RSA_PRIVATE_KEY_BASE64;

  if (pkeyEnv == null) {
    logger("[INIT] missing environment variable SERVER_RSA_PRIVATE_KEY_BASE64");
    return null;
  }

  try {
    const key = new NodeRSA(
      Buffer.from(pkeyEnv, "base64").toString("utf-8"),
      "private"
    );
    return key;
  } catch (e) {
    logger("failed to parse RSA private key", e);
  }

  return null;
}
