import { PCDProveAndAddRequest } from "@pcd/passport-interface";
import React, { useCallback, useContext, useState } from "react";
import styled from "styled-components";
import { DispatchContext } from "../../../src/dispatch";
import { Button, Spacer } from "../../core";
import { AppContainer } from "../../shared/AppContainer";
import { AppHeader } from "../../shared/AppHeader";
import { GenericProveSection } from "../ProveScreen/GenericProveSection";

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
    content = (
      <div>
        added pcd!
        <Button
          onClick={() => {
            window.close();
          }}
        >
          Close
        </Button>
      </div>
    );
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
