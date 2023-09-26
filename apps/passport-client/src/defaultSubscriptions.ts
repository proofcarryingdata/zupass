import {
  Feed,
  FeedSubscriptionManager,
  ISSUANCE_STRING,
  PCDPassFeedIds,
  Subscription
} from "@pcd/passport-interface";
import {
  AppendToFolderPermission,
  PCDPermissionType,
  ReplaceInFolderPermission
} from "@pcd/pcd-collection";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import {
  SemaphoreSignaturePCDPackage,
  SemaphoreSignaturePCDTypeName
} from "@pcd/semaphore-signature-pcd";
import { Identity } from "@semaphore-protocol/identity";
import { appConfig } from "../src/appConfig";

const DEFAULT_FEED_URL = `${appConfig.passportServer}/feeds`;
const DEFAULT_FEED_PROVIDER_NAME = "PCDPass";

const DEFAULT_FEEDS: Feed[] = [
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
      } as ReplaceInFolderPermission,
      {
        type: PCDPermissionType.AppendToFolder,
        folder: "SBC SRW"
      } as AppendToFolderPermission,
      {
        type: PCDPermissionType.ReplaceInFolder,
        folder: "SBC SRW"
      } as ReplaceInFolderPermission
    ],
    credentialType: SemaphoreSignaturePCDTypeName
  },
  {
    id: PCDPassFeedIds.Email,
    name: "PCDPass Verified Email",
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
    ],
    credentialType: SemaphoreSignaturePCDTypeName
  },
  {
    id: PCDPassFeedIds.Zuzalu_1,
    name: "Zuzalu",
    description: "Zuzalu Tickets",
    permissions: [
      {
        type: PCDPermissionType.AppendToFolder,
        folder: "Zuzalu"
      } as AppendToFolderPermission,
      {
        type: PCDPermissionType.ReplaceInFolder,
        folder: "Zuzalu"
      } as ReplaceInFolderPermission
    ],
    credentialType: SemaphoreSignaturePCDTypeName
  }
];

export function isDefaultSubscription(sub: Subscription): boolean {
  const defaultFeedIds = new Set(DEFAULT_FEEDS.map((feed) => feed.id));
  return (
    sub.providerUrl === DEFAULT_FEED_URL && defaultFeedIds.has(sub.feed.id)
  );
}

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
    const serializedSignaturePCD =
      await SemaphoreSignaturePCDPackage.serialize(signaturePCD);

    subscriptions.addProvider(DEFAULT_FEED_URL, DEFAULT_FEED_PROVIDER_NAME);

    for (const feed of DEFAULT_FEEDS) {
      subscriptions.subscribe(DEFAULT_FEED_URL, feed, serializedSignaturePCD);
    }
  }
}
