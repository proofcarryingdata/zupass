import { PCDPermissionType } from "@pcd/pcd-collection";
import { Feed, ZupassFeedIds } from "./SubscriptionManager.js";

export const zupassDefaultSubscriptions: Record<
  ZupassFeedIds.Email | ZupassFeedIds.Zuzalu_23 | ZupassFeedIds.Zuconnect_23,
  Feed
> = {
  [ZupassFeedIds.Email]: {
    id: ZupassFeedIds.Email,
    name: "Zupass Verified Emails",
    description:
      "PCDs representing Zupass Server's attestation that you own " +
      "the email address corresponding to your Zupass account. Can be " +
      "used to request PCDs from other PCD feeds.",
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

  [ZupassFeedIds.Zuzalu_23]: {
    id: ZupassFeedIds.Zuzalu_23,
    name: "Zuzalu Tickets",
    description: "EdDSATicketPCDs representing Zuzalu Tickets.",
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

  [ZupassFeedIds.Zuconnect_23]: {
    id: ZupassFeedIds.Zuconnect_23,
    name: "Zuconnect Tickets",
    description: "EdDSATicketPCDs representing Zuconnect Tickets.",
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
