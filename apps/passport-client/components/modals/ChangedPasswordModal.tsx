import { Spacer } from "@pcd/passport-ui";
import { useCallback } from "react";
import styled from "styled-components";
import { useDispatch } from "../../src/appHooks";
import { Button, H2 } from "../core";

export function ChangedPasswordModal(): JSX.Element {
  const dispatch = useDispatch();

  const close = useCallback(() => {
    dispatch({ type: "set-modal", modal: { modalType: "none" } });

    window.location.hash = "#/";
  }, [dispatch]);

  return (
    <Container>
      <H2>Password changed</H2>
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
