import {
  FeedSubscriptionManager,
  ISSUANCE_STRING,
  PCDPassFeedIds
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
  if (!subscriptions.hasProvider(DEFAULT_FEED_URL)) {
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
    const serializedSignaturePCD = await SemaphoreSignaturePCDPackage.serialize(signaturePCD);

    subscriptions.addProvider(DEFAULT_FEED_URL);

    // Subscribe to Devconnect ticket feed
    subscriptions.subscribe(
      DEFAULT_FEED_URL,
      {
        id: PCDPassFeedIds.Devconnect,
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
      serializedSignaturePCD
    );

    // Subscribe to attested email feed
    subscriptions.subscribe(
      DEFAULT_FEED_URL,
      {
        id: PCDPassFeedIds.Email,
        name: "Email",
        description: "Emails verified with PCDPass",
        permissions: [
          {
            type: PCDPermissionType.AppendToFolder,
            folder: "Email"
          } as AppendToFolderPermission,
          {
            type: PCDPermissionType.ReplaceInFolder,
            folder: "Email"
          } as ReplaceInFolderPermission
        ]
      },
      serializedSignaturePCD
    );
  }
}
