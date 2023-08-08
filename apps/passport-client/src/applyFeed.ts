import {
  ActiveSubscription,
  FeedResponseAction,
  PCDPermissionType,
  ReturnedAction
} from "@pcd/passport-interface";
import { PCDCollection } from "@pcd/pcd-collection";
import _ from "lodash";

export async function applyActions(
  collection: PCDCollection,
  actions: ReturnedAction[]
) {
  for (const action of actions) {
    for (const subAction of action.actions) {
      try {
        await applyAction(collection, subAction, action.subscription);
      } catch (e) {
        console.log(e);
      }
    }
  }
}

export async function applyAction(
  collection: PCDCollection,
  pcdAction: FeedResponseAction,
  activeSubscription: ActiveSubscription
) {
  if (!checkPermissions(pcdAction, activeSubscription)) {
    throw new Error(`permission denied`);
  }
  const deserialized = await collection.deserializeAll(pcdAction.pcds);

  if (pcdAction.permission.type === PCDPermissionType.FolderAppend) {
    for (const pcd of deserialized) {
      if (collection.hasPCDWithId(pcd.id)) {
        throw new Error(`pcd with ${pcd.id} already exists`);
      }
    }

    collection.addAll(deserialized);
    deserialized.forEach((d) =>
      collection.setFolder(d.id, pcdAction.permission.folder)
    );
  } else if (pcdAction.permission.type === PCDPermissionType.FolderReplace) {
    for (const pcd of deserialized) {
      if (
        collection.hasPCDWithId(pcd.id) &&
        collection.getFolder(pcd.id) !== pcdAction.permission.folder
      ) {
        throw new Error(
          `pcd with ${pcd.id} already exists outside the allowed folder`
        );
      }
    }
    collection.addAll(deserialized);
    deserialized.forEach((d) =>
      collection.setFolder(d.id, pcdAction.permission.folder)
    );
  }
}

export async function checkPermissions(
  pcdAction: FeedResponseAction,
  activeSubscription: ActiveSubscription
) {
  for (const allowedPermissions of activeSubscription.feed.permissions) {
    if (_.eq(allowedPermissions, pcdAction.permission)) {
      return true;
    }
  }

  return false;
}
