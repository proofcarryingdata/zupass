import { Spacer } from "@pcd/passport-ui";
import { useCallback } from "react";
import styled from "styled-components";
import { useDispatch } from "../../src/appHooks";
import { Button, H2 } from "../core";
import { AccountExportButton } from "../shared/AccountExportButton";

export function InvalidUserModal() {
  const dispatch = useDispatch();
  const onLogoutClick = useCallback(() => {
    if (
      !confirm(
        "Are you sure you want to log out? " +
          "We recommend that you export your account before doing so."
      )
    ) {
      return;
    }
    dispatch({ type: "reset-passport" });
  }, [dispatch]);

  return (
    <Container>
      <H2>Invalid Zupass</H2>
      <Spacer h={24} />
      <p>Your Zupass is in an invalid state. This can happen because:</p>
      <ul>
        <li>You reset your account on another device.</li>
        <li>Zupass application state was corrupted on this device.</li>
      </ul>
      <p>To resolve this, we recommend you either:</p>
      <ul>
        <li>Reload this page.</li>
        <li>
          Export your account data, log out of this account, and log in again.
        </li>
      </ul>
      <Spacer h={16} />
      <Spacer h={16} />
      <AccountExportButton />
      <Spacer h={16} />
      <Button onClick={onLogoutClick}>Log Out</Button>
    </Container>
  );
}

const Container = styled.div`
  padding: 24px;
  p {
    margin-bottom: 8px;
  }
  ul {
    list-style: circle;
    margin-bottom: 8px;
    li {
      margin-left: 32px;
    }
  }
`;
