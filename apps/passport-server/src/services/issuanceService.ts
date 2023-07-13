import { getHash } from "@pcd/passport-crypto";
import {
  ISSUANCE_STRING,
  IssuedPCDsRequest,
  IssuedPCDsResponse,
} from "@pcd/passport-interface";
import { ArgumentTypeName, SerializedPCD } from "@pcd/pcd-types";
import { RSAPCDPackage } from "@pcd/rsa-pcd";
import { ITicketData, RSATicketPCDPackage } from "@pcd/rsa-ticket-pcd";
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

  public constructor(context: ApplicationContext, rsaPrivateKey: NodeRSA) {
    this.context = context;
    this.rsaPrivateKey = rsaPrivateKey;
    this.exportedPrivateKey = this.rsaPrivateKey.exportKey("private");
    this.exportedPublicKey = this.rsaPrivateKey.exportKey("public");
  }

  public getPublicKey(): string {
    return this.exportedPublicKey;
  }

  public async handleRequest(
    request: IssuedPCDsRequest
  ): Promise<IssuedPCDsResponse> {
    const pcds: SerializedPCD[] = [];
    const emailOwnershipPCD = await this.issueEmailOwnershipPCD(request);
    if (emailOwnershipPCD) {
      pcds.push(emailOwnershipPCD);
    }
    return { pcds };
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
      attendeeName: "Test Name",
      eventName: "Test Event",
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
