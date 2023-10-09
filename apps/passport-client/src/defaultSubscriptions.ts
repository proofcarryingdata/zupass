import {
  Feed,
  FeedSubscriptionManager,
  ISSUANCE_STRING,
  Subscription,
  ZupassFeedIds
} from "@pcd/passport-interface";
import {
  AppendToFolderPermission,
  PCDPermissionType,
  ReplaceInFolderPermission
} from "@pcd/pcd-collection";
import { ArgumentTypeName, SerializedPCD } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import {
  SemaphoreSignaturePCDPackage,
  SemaphoreSignaturePCDTypeName
} from "@pcd/semaphore-signature-pcd";
import { Identity } from "@semaphore-protocol/identity";
import { appConfig } from "../src/appConfig";

const DEFAULT_FEED_URL = `${appConfig.zupassServer}/feeds`;
const DEFAULT_FEED_PROVIDER_NAME = "Zupass";

const DEFAULT_FEEDS: Feed[] = [
  {
    id: ZupassFeedIds.Devconnect,
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
    id: ZupassFeedIds.Email,
    name: "Zupass Verified Email",
    description: "Emails verified with Zupass",
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
    id: ZupassFeedIds.Zuzalu_1,
    name: "Zuzalu",
    description: "Zuzalu Tickets",
    permissions: [
      {
        type: PCDPermissionType.AppendToFolder,
        folder: "Zuzalu '23"
      } as AppendToFolderPermission,
      {
        type: PCDPermissionType.ReplaceInFolder,
        folder: "Zuzalu '23"
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
    subscriptions.addProvider(DEFAULT_FEED_URL, DEFAULT_FEED_PROVIDER_NAME);
  }

  // We don't want to create a proof unless we have to
  let serializedSignaturePCD: null | SerializedPCD = null;

  for (const feed of DEFAULT_FEEDS) {
    // Does this exact feed already exist?
    const existingSub = subscriptions.findSubscription(DEFAULT_FEED_URL, feed);
    if (!existingSub) {
      if (!serializedSignaturePCD) {
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
        serializedSignaturePCD =
          await SemaphoreSignaturePCDPackage.serialize(signaturePCD);
      }

      // Add or replace a feed with the given feed ID
      subscriptions.subscribe(
        DEFAULT_FEED_URL,
        feed,
        serializedSignaturePCD,
        true
      );
    }
  }
}
