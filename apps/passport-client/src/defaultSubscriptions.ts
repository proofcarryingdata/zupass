import {
  FeedSubscriptionManager,
  ISSUANCE_STRING
} from "@pcd/passport-interface";
import {
  AppendToFolderPermission,
  PCDPermissionType,
  ReplaceInFolderPermission
} from "@pcd/pcd-collection";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { Identity } from "@semaphore-protocol/identity";
import { appConfig } from "../src/appConfig";

const DEFAULT_FEED_URL = `${appConfig.passportServer}/feeds`;

export async function addDefaultSubscriptions(
  identity: Identity,
  subscriptions: FeedSubscriptionManager
) {
  const signaturePCD = await SemaphoreSignaturePCDPackage.prove({
    identity: {
      argumentType: ArgumentTypeName.PCD,
      value: await SemaphoreIdentityPCDPackage.serialize(
        await SemaphoreIdentityPCDPackage.prove({
          identity: identity
        })
      )
    },
    signedMessage: {
      argumentType: ArgumentTypeName.String,
      value: ISSUANCE_STRING
    }
  });

  if (signaturePCD && !subscriptions.hasProvider(DEFAULT_FEED_URL)) {
    subscriptions.addProvider(DEFAULT_FEED_URL);
    subscriptions.subscribe(
      DEFAULT_FEED_URL,
      {
        id: "1",
        name: "Devconnect",
        description: "Devconnect Tickets",
        permissions: [
          {
            type: PCDPermissionType.AppendToFolder,
            folder: "Devconnect"
          } as AppendToFolderPermission,
          {
            type: PCDPermissionType.ReplaceInFolder,
            folder: "Devconnect"
          } as ReplaceInFolderPermission
        ]
      },
      await SemaphoreSignaturePCDPackage.serialize(signaturePCD)
    );
  }
}
