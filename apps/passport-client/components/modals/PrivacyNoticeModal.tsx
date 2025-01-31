import { LATEST_PRIVACY_NOTICE, agreeTerms } from "@pcd/passport-interface";
import { Spacer } from "@pcd/passport-ui";
import { useCallback, useState } from "react";
import styled from "styled-components";
import { appConfig } from "../../src/appConfig";
import { useDispatch, useIdentityV3 } from "../../src/appHooks";
import { savePrivacyNoticeAgreed } from "../../src/localstorage";
import { Button, H2 } from "../core";
import { RippleLoader } from "../core/RippleLoader";
import { PrivacyNotice } from "../shared/PrivacyNotice";

export function PrivacyNoticeModal(): JSX.Element {
  const dispatch = useDispatch();
  const identity = useIdentityV3();
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

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
      await savePrivacyNoticeAgreed(LATEST_PRIVACY_NOTICE);
      dispatch({
        type: "handle-agreed-privacy-notice",
        version: LATEST_PRIVACY_NOTICE
      });
    }
  }, [dispatch, identity]);

  return (
    <Container>
      <H2>Updated Terms of Use</H2>
      <Spacer h={24} />
      <p>To continue using Zupass, please agree to the following terms:</p>
      <PrivacyNotice />
      <Spacer h={8} />
      {isSubmitting && <RippleLoader />}
      {!isSubmitting && <Button onClick={onClick}>Agree</Button>}
    </Container>
  );
}

const Container = styled.div`
  padding: 24px;
`;
