import { Spacer } from "@pcd/passport-ui";
import { useCallback } from "react";
import styled from "styled-components";
import { useDispatch } from "../../src/appHooks";
import { Button, H1 } from "../core";

export function InvalidUserModal() {
  const dispatch = useDispatch();

  const onClick = useCallback(() => {
    dispatch({ type: "reset-passport" });
  }, [dispatch]);

  return (
    <Container>
      <Spacer h={8} />
      <H1>Invalid Zupass</H1>
      <Spacer h={24} />
      <p>
        You've reset your Zupass account on another device, invalidating this
        one. Click the button below to log out. Then you'll be able to sync your
        existing Zupass account onto this device.
      </p>
      <Spacer h={24} />
      <Button onClick={onClick}>Exit</Button>
    </Container>
  );
}

const Container = styled.div`
  padding: 24px;
`;
