import { PCDProveAndAddRequest } from "@pcd/passport-interface";
import { useCallback, useContext, useState } from "react";
import styled from "styled-components";
import { DispatchContext } from "../../../src/dispatch";
import { Spacer } from "../../core";
import { AddedPCD } from "../../shared/AddedPCD";
import { AppContainer } from "../../shared/AppContainer";
import { AppHeader } from "../../shared/AppHeader";
import { GenericProveSection } from "../ProveScreen/GenericProveSection";

/**
 * Screen that allows the user to prove a new PCD, and then add it to the
 * passport.
 */
export function ProveAndAddScreen({
  request,
}: {
  request: PCDProveAndAddRequest;
}) {
  const [_, dispatch] = useContext(DispatchContext);
  const [proved, setProved] = useState(false);

  const onProve = useCallback(
    async (_pcd, serializedPCD) => {
      await dispatch({ type: "add-pcd", pcd: serializedPCD });
      setProved(true);
    },
    [dispatch]
  );

  let content;

  if (!proved) {
    content = (
      <GenericProveSection
        initialArgs={request.args}
        pcdType={request.pcdType}
        onProve={onProve}
      />
    );
  } else {
    content = <AddedPCD />;
  }

  return (
    <AppContainer bg="gray">
      <Container>
        <Spacer h={24} />
        <AppHeader />
        <Spacer h={16} />
        {content}
      </Container>
    </AppContainer>
  );
}

const Container = styled.div`
  padding: 16px;
  width: 100%;
  max-width: 100%;
`;
