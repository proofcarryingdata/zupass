import {
  AppendToFolderPermission,
  DeleteFolderPermission,
  PCDPermissionType,
  ReplaceInFolderPermission
} from "@pcd/pcd-collection";
import { Feed, ZupassFeedIds } from "./SubscriptionManager";

export const zupassDefaultSubscriptions: Record<
  ZupassFeedIds.Devconnect | ZupassFeedIds.Email | ZupassFeedIds.Zuzalu_1,
  Feed
> = {
  [ZupassFeedIds.Zuzalu_1]: {
    id: ZupassFeedIds.Zuzalu_1,
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
      } as DeleteFolderPermission,
      {
        folder: "Zuzalu '23",
        type: PCDPermissionType.ReplaceInFolder
      } as ReplaceInFolderPermission
    ]
  },
  [ZupassFeedIds.Devconnect]: {
    id: ZupassFeedIds.Devconnect,
    name: "Devconnect Tickets",
    description: "Get your Devconnect tickets here!",
    partialArgs: undefined,
    credentialRequest: {
      signatureType: "sempahore-signature-pcd"
    },
    permissions: [
      {
        folder: "Devconnect",
        type: PCDPermissionType.AppendToFolder
      } as AppendToFolderPermission,
      {
        folder: "Devconnect",
        type: PCDPermissionType.ReplaceInFolder
      } as ReplaceInFolderPermission,
      {
        folder: "Devconnect",
        type: PCDPermissionType.DeleteFolder
      } as DeleteFolderPermission,
      {
        folder: "SBC SRW",
        type: PCDPermissionType.AppendToFolder
      } as AppendToFolderPermission,
      {
        folder: "SBC SRW",
        type: PCDPermissionType.ReplaceInFolder
      } as ReplaceInFolderPermission,
      {
        folder: "SBC SRW",
        type: PCDPermissionType.DeleteFolder
      } as DeleteFolderPermission
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
      } as DeleteFolderPermission,
      {
        folder: "Email",
        type: PCDPermissionType.ReplaceInFolder
      } as ReplaceInFolderPermission
    ]
  }
};
