import { useEffect } from "react";

/**
 * A screen where the user can subscribe to new frog feeds via deeplink.
 */
export function FrogSubscriptionScreen() {
  useEffect(() => {
    // redirect to the frog manager screen
    window.location.replace("/#/?folder=FrogCrypto");
  }, []);

  return <></>;
}
