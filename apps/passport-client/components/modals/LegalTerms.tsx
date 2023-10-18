import { LATEST_TERMS, agreeTerms } from "@pcd/passport-interface";
import { Spacer } from "@pcd/passport-ui";
import { useCallback, useState } from "react";
import styled from "styled-components";
import { appConfig } from "../../src/appConfig";
import { useDispatch, useIdentity } from "../../src/appHooks";
import { saveTermsAgreed } from "../../src/localstorage";
import { Button, H2 } from "../core";
import { Spinner } from "../shared/Spinner";
import { TermsOfUse } from "../shared/TermsOfUse";

export function LegalTermsModal() {
  const dispatch = useDispatch();
  const identity = useIdentity();
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const onClick = useCallback(async () => {
    setIsSubmitting(true);
    const result = await agreeTerms(
      appConfig.zupassServer,
      LATEST_TERMS,
      identity
    );
    setIsSubmitting(false);

    if (result.success) {
      dispatch({ type: "terms-agreed", version: result.value.version });
    } else {
      // Persist to local storage and sync this later
      saveTermsAgreed(LATEST_TERMS);
      dispatch({ type: "terms-agreed", version: result.value.version });
    }
  }, [dispatch, identity]);

  return (
    <Container>
      <H2>Updated Terms of Use</H2>
      <Spacer h={24} />
      <p>To continue using Zupass, please agree to the following terms:</p>
      <TermsOfUse />
      <Spacer h={24} />
      <Button onClick={onClick}>
        <Spinner text="Agree" show={isSubmitting} />
      </Button>
    </Container>
  );
}

const Container = styled.div`
  padding: 24px;
`;
