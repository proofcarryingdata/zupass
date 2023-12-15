import { Spacer } from "@pcd/passport-ui";
import { useCallback } from "react";
import styled from "styled-components";
import { useDispatch } from "../../src/appHooks";
import { Button, H2 } from "../core";
import { AccountExportButton } from "../shared/AccountExportButton";

export function InvalidUserModal() {
  const dispatch = useDispatch();

  const onExitClick = useCallback(() => {
    dispatch({ type: "reset-passport" });
  }, [dispatch]);

  return (
    <Container>
      <H2>Invalid Zupass</H2>
      <Spacer h={24} />
      <p>
        You've reset your Zupass account on another device, or your app has
        ended up in an invalid state. Click the button below to log out. Then
        you'll be able to sync your existing Zupass account onto this device.
      </p>
      <Spacer h={16} />
      <p>
        You can export a copy of your local account data using the button below
        in case you need it later.
      </p>
      <Spacer h={16} />
      <AccountExportButton />
      <Spacer h={16} />
      <Button onClick={onExitClick}>Exit</Button>
    </Container>
  );
}

const Container = styled.div`
  padding: 24px;
`;
