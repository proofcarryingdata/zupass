import { PCDCollection } from "@pcd/pcd-collection";
import { ArgumentTypeName, SerializedPCD } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { Identity } from "@semaphore-protocol/identity";
import {
  FeedCredentialPayload,
  createFeedCredentialPayload
} from "./FeedCredential";
import { CredentialRequest } from "./SubscriptionManager";

export interface CredentialManagerAPI {
  canGenerateCredential(req: CredentialRequest): boolean;
  requestCredential(req: CredentialRequest): Promise<SerializedPCD>;
}

export class CredentialManager implements CredentialManagerAPI {
  private readonly identity: Identity;
  private readonly pcds: PCDCollection;

  public constructor(identity: Identity, pcds: PCDCollection) {
    this.identity = identity;
    this.pcds = pcds;
  }

  // Can we get a credential containing a given PCD type?
  public canGenerateCredential(req: CredentialRequest): boolean {
    if (req.pcdType === "email-pcd") {
      return this.pcds.getPCDsByType(req.pcdType).length !== 0;
    } else if (req.pcdType === undefined) {
      return true;
    } else {
      // We can't generate credentials containing any other PCD type yet
      return false;
    }
  }

  public async requestCredential(
    req: CredentialRequest
  ): Promise<SerializedPCD> {
    switch (req.pcdType) {
      // This is currently the only supported PCD for credential embedding
      case "email-pcd":
        const pcds = this.pcds.getPCDsByType(req.pcdType);
        if (pcds.length === 0) {
          throw new Error(
            `Could not find a PCD of type ${req.pcdType} for credential payload`
          );
        }
        // In future we might want to support multiple email PCDs, but this
        // works for now
        const pcd = pcds[0];
        const serializedPCD = await this.pcds.serialize(pcd);
        return this.signPayload(createFeedCredentialPayload(serializedPCD));
      case undefined:
        return this.signPayload(createFeedCredentialPayload());
      default:
        // @todo use the types, Luke
        throw new Error(
          `Cannot issue credential containing a PCD of type ${req.pcdType}`
        );
    }
  }

  private async signPayload(
    payload: FeedCredentialPayload
  ): Promise<SerializedPCD> {
    // In future we might support other types of signature here
    const signaturePCD = await SemaphoreSignaturePCDPackage.prove({
      identity: {
        argumentType: ArgumentTypeName.PCD,
        value: await SemaphoreIdentityPCDPackage.serialize(
          await SemaphoreIdentityPCDPackage.prove({
            identity: this.identity
          })
        )
      },
      signedMessage: {
        argumentType: ArgumentTypeName.String,
        value: JSON.stringify(payload)
      }
    });

    return await SemaphoreSignaturePCDPackage.serialize(signaturePCD);
  }
}
