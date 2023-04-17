import { PCDProveAndAddRequest } from "@pcd/passport-interface";
import React, { useCallback, useContext } from "react";
import styled from "styled-components";
import { DispatchContext } from "../../../src/dispatch";
import { Spacer } from "../../core";
import { AppContainer } from "../../shared/AppContainer";
import { AppHeader } from "../../shared/AppHeader";
import { GenericProveSection } from "../ProveScreen/GenericProveSection";

export function ProveAndAddScreen({
  request,
}: {
  request: PCDProveAndAddRequest;
}) {
  const [_, dispatch] = useContext(DispatchContext);
  const onProve = useCallback(
    async (_pcd, serializedPCD) => {
      await dispatch({ type: "add-pcd", pcd: serializedPCD });
      window.close();
    },
    [dispatch]
  );

  return (
    <AppContainer bg="gray">
      <Container>
        <Spacer h={24} />
        <AppHeader />
        <Spacer h={16} />
        <GenericProveSection
          initialArgs={request.args}
          pcdType={request.pcdType}
          onProve={onProve}
        />
      </Container>
    </AppContainer>
  );
}

const Container = styled.div`
  padding: 16px;
  width: 100%;
  max-width: 100%;
`;
