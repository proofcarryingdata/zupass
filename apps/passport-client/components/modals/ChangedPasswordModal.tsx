import { Spacer } from "@pcd/passport-ui";
import { useCallback } from "react";
import styled from "styled-components";
import { useDispatch } from "../../src/appHooks";
import { Button, H1 } from "../core";

export function ChangedPasswordModal() {
  const dispatch = useDispatch();

  const close = useCallback(() => {
    dispatch({ type: "set-modal", modal: "" });

    window.location.hash = "#/";
  }, [dispatch]);

  return (
    <Container>
      <Spacer h={8} />
      <H1>Password changed</H1>
      <Spacer h={24} />
      <p>You have successfully updated your password.</p>
      <Spacer h={24} />
      <Button onClick={close}>Return</Button>
    </Container>
  );
}

const Container = styled.div`
  padding: 24px;
`;
