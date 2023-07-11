import { IssuedPCDsRequest, IssuedPCDsResponse } from "@pcd/passport-interface";
import { RSAPCD } from "@pcd/rsa-pcd";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { fetchCommitmentByPublicCommitment } from "../database/queries/commitments";
import { ApplicationContext } from "../types";
import { logger } from "../util/logger";

export class IssuanceService {
  private readonly context: ApplicationContext;

  public constructor(context: ApplicationContext) {
    this.context = context;
  }

  public async handleRequest(
    request: IssuedPCDsRequest
  ): Promise<IssuedPCDsResponse> {
    return {
      pcds: [],
    };
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

    return null;
  }
}

export function startIssuanceService(
  context: ApplicationContext
): IssuanceService {
  const issuanceService = new IssuanceService(context);
  return issuanceService;
}
