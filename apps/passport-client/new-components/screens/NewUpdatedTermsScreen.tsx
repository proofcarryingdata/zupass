import { agreeTerms, LATEST_PRIVACY_NOTICE } from "@pcd/passport-interface";
import { useCallback, useEffect, useState } from "react";
import { AppContainer } from "../../components/shared/AppContainer";
import { appConfig } from "../../src/appConfig";
import { useDispatch, useIdentityV3, useSelf } from "../../src/appHooks";
import { savePrivacyNoticeAgreed } from "../../src/localstorage";
import { TermsWithTitle } from "../shared/NewPrivacyNotice";

export const NewUpdatedTermsScreen = (): JSX.Element => {
  const dispatch = useDispatch();
  const identity = useIdentityV3();
  const self = useSelf();
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!self) {
      window.location.hash = "#/login";
    }
  }, [self]);

  const onClick = useCallback(async () => {
    setIsSubmitting(true);
    const result = await agreeTerms(
      appConfig.zupassServer,
      LATEST_PRIVACY_NOTICE,
      identity
    );
    setIsSubmitting(false);

    if (result.success) {
      dispatch({
        type: "handle-agreed-privacy-notice",
        version: result.value.version
      });
    } else {
      // Persist to local storage and sync this later
      savePrivacyNoticeAgreed(LATEST_PRIVACY_NOTICE);
      dispatch({
        type: "handle-agreed-privacy-notice",
        version: LATEST_PRIVACY_NOTICE
      });
    }
  }, [dispatch, identity]);

  return (
    <AppContainer bg="gray">
      <TermsWithTitle
        title="UPDATED TERMS OF USE"
        onAgree={onClick}
        loading={isSubmitting}
      />
    </AppContainer>
  );
};
