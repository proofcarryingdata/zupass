import { useCallback } from "react";
import styled from "styled-components";
import { useSubscriptions } from "../../src/appHooks";
import { Button } from "../core";

export function SubscriptionsScreen() {
  const { value: subs } = useSubscriptions();

  const onAddNewClicked = useCallback(() => {
    window.location.href = "/#/add-subscription";
  }, []);

  return (
    <Container>
      these are your subscriptions
      <br />
      you have:
      <div>{subs.getProviders().length} providers</div>
      <div>{subs.getActiveSubscriptions().length} active subscriptions</div>
      <Button onClick={onAddNewClicked}>Add a new subscription</Button>
    </Container>
  );
}

const Container = styled.div`
  padding: 64px;
`;
