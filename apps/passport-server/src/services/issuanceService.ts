import { getHash } from "@pcd/passport-crypto";
import {
  CheckInRequest,
  CheckInResponse,
  ISSUANCE_STRING,
  IssuedPCDsRequest,
  IssuedPCDsResponse,
} from "@pcd/passport-interface";
import { ArgumentTypeName, SerializedPCD } from "@pcd/pcd-types";
import { RSAPCDPackage } from "@pcd/rsa-pcd";
import {
  getPublicKey,
  ITicketData,
  RSATicketPCDPackage,
} from "@pcd/rsa-ticket-pcd";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import NodeRSA from "node-rsa";
import { fetchCommitmentByPublicCommitment } from "../database/queries/commitments";
import { ApplicationContext } from "../types";
import { logger } from "../util/logger";

export class IssuanceService {
  private readonly context: ApplicationContext;
  private readonly rsaPrivateKey: NodeRSA;
  private readonly exportedPrivateKey: string;
  private readonly exportedPublicKey: string;

  // TODO: implement with database calls
  private readonly usedTicketPCDIds: Set<string>;

  public constructor(context: ApplicationContext, rsaPrivateKey: NodeRSA) {
    this.context = context;
    this.rsaPrivateKey = rsaPrivateKey;
    this.exportedPrivateKey = this.rsaPrivateKey.exportKey("private");
    this.exportedPublicKey = this.rsaPrivateKey.exportKey("public");
    this.usedTicketPCDIds = new Set();
  }

  public getPublicKey(): string {
    return this.exportedPublicKey;
  }

  public async handleIssueRequest(
    request: IssuedPCDsRequest
  ): Promise<IssuedPCDsResponse> {
    const pcds: SerializedPCD[] = [];
    const emailOwnershipPCD = await this.issueEmailOwnershipPCD(request);
    if (emailOwnershipPCD) {
      pcds.push(emailOwnershipPCD);
    }
    return { pcds };
  }

  public async handleCheckInRequest(
    request: CheckInRequest
  ): Promise<CheckInResponse> {
    try {
      const ticketPCD = await RSATicketPCDPackage.deserialize(
        request.ticket.pcd
      );
      const proofPublicKey = getPublicKey(ticketPCD)?.exportKey("public");
      if (!proofPublicKey) {
        throw new Error("failed to get public key from proof");
      }
      const serverPublicKey = this.getPublicKey();

      if (serverPublicKey !== proofPublicKey) {
        throw new Error("ticket was not signed with the right key");
      }

      if (this.usedTicketPCDIds.has(ticketPCD.id)) {
        throw new Error("this ticket has already been used");
      }

      // TODO: load this from the database
      // make sure that the ticket has not been revoked
      // make sure that the ticket has bot already been used to check in
      const isTicketValid = true;

      if (isTicketValid) {
        this.usedTicketPCDIds.add(ticketPCD.id);
        return {
          success: true,
        };
      }

      return {
        success: false,
      };
    } catch (e) {
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

  private async issueEmailOwnershipPCD(
    request: IssuedPCDsRequest
  ): Promise<SerializedPCD | null> {
    const email = await this.getUserEmailFromRequest(request);

    if (email == null) {
      return null;
    }

    // TODO: convert from pretix ticket to {@link ITicketData}
    const ticketData: ITicketData = {
      attendeeEmail: email,
      attendeeName: "Ivan Chub",
      eventName: "ProgCrypto",
      ticketName: "GA",
      ticketId: "5",
      timestamp: Date.now(),
    };

    const serializedTicketData = JSON.stringify(ticketData);
    const stableId = await getHash("issued-ticket-" + ticketData.ticketId);

    const rsaPcd = await RSAPCDPackage.prove({
      privateKey: {
        argumentType: ArgumentTypeName.String,
        value: this.exportedPrivateKey,
      },
      signedMessage: {
        argumentType: ArgumentTypeName.String,
        value: serializedTicketData,
      },
      id: {
        argumentType: ArgumentTypeName.String,
        value: undefined,
      },
    });

    const rsaTicketPCD = await RSATicketPCDPackage.prove({
      id: {
        argumentType: ArgumentTypeName.String,
        value: stableId,
      },
      rsaPCD: {
        argumentType: ArgumentTypeName.PCD,
        value: await RSAPCDPackage.serialize(rsaPcd),
      },
    });

    const serializedTicketPCD = await RSATicketPCDPackage.serialize(
      rsaTicketPCD
    );

    return serializedTicketPCD;
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
