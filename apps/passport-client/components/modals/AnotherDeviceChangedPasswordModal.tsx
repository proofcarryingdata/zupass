import { Spacer } from "@pcd/passport-ui";
import { useCallback } from "react";
import styled from "styled-components";
import { useDispatch } from "../../src/appHooks";
import { Button, H2 } from "../core";

export function AnotherDeviceChangedPasswordModal(): JSX.Element {
  const dispatch = useDispatch();

  const onClick = useCallback(() => {
    dispatch({ type: "reset-passport" });
  }, [dispatch]);

  return (
    <Container>
      <H2>Session Invalid</H2>
      <Spacer h={24} />
      <p>
        You've changed your password on another device, logging you out of all
        other sessions. Click the button below to log out. Then you'll be able
        to log in with your new password.
      </p>
      <Spacer h={24} />
      <Button onClick={onClick}>Logout</Button>
    </Container>
  );
}

const Container = styled.div`
  padding: 24px;
`;
