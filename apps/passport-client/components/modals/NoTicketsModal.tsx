import { Spacer } from "@pcd/passport-ui";
import { useCallback } from "react";
import styled from "styled-components";
import { useDispatch, useSelf } from "../../src/appHooks";
import { H2, SupportLink } from "../core";

export function NoTicketsModal(): JSX.Element {
  const dispatch = useDispatch();
  const self = useSelf();
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
      <H2>No Tickets</H2>
      <Spacer h={16} />
      <p>
        If you don't see your tickets, we suggest that you check that you've
        logged in with the correct email address. Please check your email
        inboxes for your ticket purchase confirmation email to confirm you've
        logged in with the correct email address.
      </p>
      <Spacer h={16} />
      <p>You are currently logged in as "{self?.email}".</p>
      <Spacer h={16} />
      <p>
        If this issue persists, please contact us at <SupportLink />. If you are
        currently at an event and attempting to check in, please find us at the
        help desk.
      </p>
    </Container>
  );
}

const Container = styled.div`
  padding: 24px;
  padding-bottom: 0;

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
