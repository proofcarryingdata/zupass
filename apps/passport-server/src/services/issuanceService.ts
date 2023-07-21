import { getHash } from "@pcd/passport-crypto";
import {
  CheckInRequest,
  CheckInResponse,
  CheckTicketRequest,
  CheckTicketResponse,
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
  RSATicketPCD,
  RSATicketPCDPackage
} from "@pcd/rsa-ticket-pcd";
import {
  SemaphoreSignaturePCD,
  SemaphoreSignaturePCDPackage
} from "@pcd/semaphore-signature-pcd";
import NodeRSA from "node-rsa";
import { CommitmentRow } from "../database/models";
import { fetchCommitmentByPublicCommitment } from "../database/queries/commitments";
import {
  fetchDevconnectPretixTicketByTicketId,
  fetchDevconnectPretixTicketsByEmail,
  fetchDevconnectSuperusersForEmail
} from "../database/queries/devconnect_pretix_tickets/fetchDevconnectPretixTicket";
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

      const ticketValid = await this.checkTicket(ticketPCD);

      if (!ticketValid.success) {
        return ticketValid;
      }

      const ticketData = getTicketData(ticketPCD);

      const checker = await this.checkUserExists(request.checkerProof);

      if (!checker) {
        return {
          success: false,
          error: { name: "NotSuperuser" }
        };
      }

      const checkerSuperUserPermissions =
        await fetchDevconnectSuperusersForEmail(
          this.context.dbPool,
          checker.email
        );

      const relevantSuperUserPermission = checkerSuperUserPermissions.find(
        (perm) => perm.pretix_events_config_id === 1
      );

      if (!relevantSuperUserPermission) {
        return { success: false, error: { name: "NotSuperuser" } };
      }

      const successfullyConsumed = await consumeDevconnectPretixTicket(
        this.context.dbPool,
        parseInt(ticketData.ticketId ?? "", 10)
      );

      if (successfullyConsumed) {
        return {
          success: true
        };
      }

      return {
        success: false,
        error: { name: "ServerError" }
      };
    } catch (e) {
      logger("Error when consuming devconnect ticket", { error: e });
      throw new Error("failed to check in");
    }
  }

  public async handleCheckTicketRequest(
    request: CheckTicketRequest
  ): Promise<CheckTicketResponse> {
    try {
      const ticketPCD = await RSATicketPCDPackage.deserialize(
        request.ticket.pcd
      );
      return this.checkTicket(ticketPCD);
    } catch (e) {
      return {
        success: false,
        error: { name: "ServerError" }
      };
    }
  }

  public async checkTicket(
    ticketPCD: RSATicketPCD
  ): Promise<CheckTicketResponse> {
    try {
      const proofPublicKey = getPublicKey(ticketPCD)?.exportKey("public");
      if (!proofPublicKey) {
        return {
          success: false,
          error: { name: "InvalidSignature" }
        };
      }

      const serverPublicKey = this.getPublicKey();
      if (serverPublicKey !== proofPublicKey) {
        return {
          success: false,
          error: { name: "InvalidSignature" }
        };
      }

      const { ticketId } = getTicketData(ticketPCD);
      if (!ticketId) {
        return {
          success: false,
          error: { name: "InvalidTicket" }
        };
      }

      const ticketInDb = await fetchDevconnectPretixTicketByTicketId(
        this.context.dbPool,
        parseInt(ticketId ?? "", 10)
      );

      if (!ticketInDb) {
        return {
          success: false,
          error: { name: "InvalidTicket" }
        };
      }

      if (ticketInDb.is_deleted) {
        return {
          success: false,
          error: { name: "TicketRevoked", revokedTimestamp: Date.now() }
        };
      }

      if (ticketInDb.is_consumed) {
        return {
          success: false,
          error: { name: "AlreadyCheckedIn", checkinTimestamp: Date.now() }
        };
      }

      return { success: true };
    } catch (e) {
      logger("Error when checking ticket", { error: e });

      return {
        success: false,
        error: { name: "ServerError" }
      };
    }
  }

  private async checkUserExists(
    proof: SerializedPCD<SemaphoreSignaturePCD>
  ): Promise<CommitmentRow | null> {
    const deserializedSignature =
      await SemaphoreSignaturePCDPackage.deserialize(proof.pcd);
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

    return storedCommitment;
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
    const commitment = await this.checkUserExists(request.userProof);
    const email = commitment?.email;

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
