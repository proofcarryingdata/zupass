import { PCDPermissionType } from "@pcd/pcd-collection";
import { Feed, ZupassFeedIds } from "./SubscriptionManager";

export const zupassAutoUnsubscribeFeedIds = [ZupassFeedIds.Devconnect];

export const zupassDefaultSubscriptions: Record<
  ZupassFeedIds.Email | ZupassFeedIds.Zuzalu_23 | ZupassFeedIds.Zuconnect_23,
  Feed
> = {
  [ZupassFeedIds.Zuzalu_23]: {
    id: ZupassFeedIds.Zuzalu_23,
    name: "Zuzalu tickets",
    description: "Your Zuzalu Tickets",
    partialArgs: undefined,
    credentialRequest: {
      signatureType: "sempahore-signature-pcd"
    },
    permissions: [
      {
        folder: "Zuzalu '23",
        type: PCDPermissionType.DeleteFolder
      },
      {
        folder: "Zuzalu '23",
        type: PCDPermissionType.ReplaceInFolder
      }
    ]
  },
  [ZupassFeedIds.Email]: {
    id: ZupassFeedIds.Email,
    name: "Zupass Verified Emails",
    description: "Emails verified by Zupass",
    partialArgs: undefined,
    credentialRequest: {
      signatureType: "sempahore-signature-pcd"
    },
    permissions: [
      {
        folder: "Email",
        type: PCDPermissionType.DeleteFolder
      },
      {
        folder: "Email",
        type: PCDPermissionType.ReplaceInFolder
      }
    ]
  },
  [ZupassFeedIds.Zuconnect_23]: {
    id: ZupassFeedIds.Zuconnect_23,
    name: "Zuconnect tickets",
    description: "Your Zuconnect Tickets",
    partialArgs: undefined,
    credentialRequest: {
      signatureType: "sempahore-signature-pcd"
    },
    permissions: [
      {
        folder: "Zuconnect",
        type: PCDPermissionType.DeleteFolder
      },
      {
        folder: "ZuConnect",
        type: PCDPermissionType.DeleteFolder
      },
      {
        folder: "ZuConnect",
        type: PCDPermissionType.ReplaceInFolder
      }
    ]
  }
};
