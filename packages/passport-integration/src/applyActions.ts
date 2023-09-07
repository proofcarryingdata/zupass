import { SubscriptionActions } from "@pcd/passport-interface";
import { PCDCollection } from "@pcd/pcd-collection";

export async function applyActions(
  collection: PCDCollection,
  actions: SubscriptionActions[]
) {
  for (const actionSet of actions) {
    for (const action of actionSet.actions) {
      try {
        await collection.tryExec(
          action,
          actionSet.subscription.feed.permissions
        );
      } catch (e) {
        console.log(e);
      }
    }
  }
}
