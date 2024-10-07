import { useCallback, useEffect } from "react";
import { AppContainer } from "../../components/shared/AppContainer";
import { useQuery } from "../../src/appHooks";
import { hasPendingRequest } from "../../src/sessionStorage";
import { TermsWithTitle } from "../shared/NewPrivacyNotice";

export const NewPrivacyNoticeScreen = (): JSX.Element | null => {
  const query = useQuery();
  const email = query?.get("email");
  const token = query?.get("token");

  const onClick = useCallback(() => {
    if (!email || !token) return;
    window.location.hash = `#/create-password?email=${encodeURIComponent(
      email
    )}&token=${encodeURIComponent(token)}`;
  }, [email, token]);

  useEffect(() => {
    if (!email || !token) {
      if (hasPendingRequest()) {
        window.location.hash = "#/login-interstitial";
      } else {
        window.location.hash = "#/";
      }
    }
  }, [email, token]);

  if (!email || !token) {
    return null;
  }

  return (
    <AppContainer bg="gray">
      <TermsWithTitle title="TERMS OF USE" onAgree={onClick} />
    </AppContainer>
  );
};
