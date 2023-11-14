import { FrogCryptoFolderName } from "@pcd/passport-interface";
import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useIsSyncSettled, useSubscriptions } from "../../../src/appHooks";
import { useSyncE2EEStorage } from "../../../src/useSyncE2EEStorage";
import { RippleLoader } from "../../core/RippleLoader";

export const FROM_SUBSCRIPTION_PARAM_KEY = "fromFrogSubscription";

/**
 * A screen where the user can subscribe to new frog feeds via deeplink.
 */
export function FrogSubscriptionScreen() {
  useSyncE2EEStorage();
  const syncSettled = useIsSyncSettled();

  // get current frog subscriptions
  const { value: subs } = useSubscriptions();
  const frogSubs = subs
    .getActiveSubscriptions()
    .filter((sub) => sub.providerUrl.includes("frogcrypto"));
  const hasFrogSubs = frogSubs.length > 0;

  const { feedCode } = useParams();

  useEffect(() => {
    if (syncSettled) {
      // if the user has no frog subscriptions,
      // redirect to the frog manager screen
      if (!hasFrogSubs || !feedCode) {
        window.location.replace(
          `/#/?folder=${FrogCryptoFolderName}&${FROM_SUBSCRIPTION_PARAM_KEY}=true`
        );
      } else {
        window.location.replace(
          `/#/?folder=${FrogCryptoFolderName}&feedId=${feedCode}`
        );
      }
    }
  }, [feedCode, hasFrogSubs, syncSettled]);

  return <RippleLoader />;
}
