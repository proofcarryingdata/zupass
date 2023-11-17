import { FrogCryptoFolderName } from "@pcd/passport-interface";
import { useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  useIsSyncSettled,
  useSelf,
  useSubscriptions,
  useUserForcedToLogout
} from "../../../src/appHooks";
import {
  clearAllPendingRequests,
  pendingViewFrogCryptoRequestKey,
  setPendingViewFrogCryptoRequest
} from "../../../src/sessionStorage";
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

  const self = useSelf();
  const userForcedToLogout = useUserForcedToLogout();

  useEffect(() => {
    if (self == null || userForcedToLogout) {
      clearAllPendingRequests();
      const stringifiedRequest = JSON.stringify(feedCode);
      setPendingViewFrogCryptoRequest(stringifiedRequest);
      if (self == null) {
        window.location.href = `/#/login?redirectedFromAction=true&${pendingViewFrogCryptoRequestKey}=${encodeURIComponent(
          stringifiedRequest
        )}`;
      }
    }
  }, [feedCode, self, userForcedToLogout]);

  return <RippleLoader />;
}
