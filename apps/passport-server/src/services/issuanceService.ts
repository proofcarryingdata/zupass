import { IssuedPCDsRequest, IssuedPCDsResponse } from "@pcd/passport-interface";
import { ArgumentTypeName, SerializedPCD } from "@pcd/pcd-types";
import { RSAPCD, RSAPCDPackage } from "@pcd/rsa-pcd";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import NodeRSA from "node-rsa";
import { fetchCommitmentByPublicCommitment } from "../database/queries/commitments";
import { ApplicationContext } from "../types";
import { logger } from "../util/logger";

export class IssuanceService {
  private readonly context: ApplicationContext;
  private readonly rsaPrivateKey: NodeRSA;

  public constructor(context: ApplicationContext, rsaPrivateKey: NodeRSA) {
    this.context = context;
    this.rsaPrivateKey = rsaPrivateKey;
  }

  public async handleRequest(
    request: IssuedPCDsRequest
  ): Promise<IssuedPCDsResponse> {
    const pcds: SerializedPCD[] = [];
    const emailOwnershipPCD = await this.issueEmailOwnershipPCD(request);
    if (emailOwnershipPCD) {
      const serializedPCD = await RSAPCDPackage.serialize(emailOwnershipPCD);
      pcds.push(serializedPCD);
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
  ): Promise<RSAPCD | null> {
    const email = await this.getUserEmailFromRequest(request);

    if (email == null) {
      return null;
    }

    const ownershipPCD = await RSAPCDPackage.prove({
      privateKey: {
        argumentType: ArgumentTypeName.String,
        value: this.rsaPrivateKey.exportKey("private"),
      },
      signedMessage: {
        argumentType: ArgumentTypeName.String,
        value: email,
      },
    });

    return ownershipPCD;
  }
}

export function startIssuanceService(
  context: ApplicationContext
): IssuanceService | null {
  const pkey = loadPrivateKey();

  if (pkey == null) {
    return null;
  }

  const issuanceService = new IssuanceService(context, pkey);
  return issuanceService;
}

function loadPrivateKey(): NodeRSA | null {
  const pkeyEnv = process.env.SERVER_RSA_PRIVATE_KEY_BASE64;

  if (pkeyEnv == null) {
    return null;
  }

  try {
    const key = new NodeRSA(pkeyEnv, "private");
    return key;
  } catch (e) {
    logger("failed to parse RSA private key", e);
  }

  return null;
}
