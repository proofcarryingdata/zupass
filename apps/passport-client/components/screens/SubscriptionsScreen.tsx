import {
  ActiveSubscription,
  SubscriptionManager
} from "@pcd/passport-interface";
import { useCallback, useMemo } from "react";
import styled from "styled-components";
import { useSubscriptions } from "../../src/appHooks";
import { Button, Spacer } from "../core";
import { SubscriptionInfoRow } from "./AddSubscriptionScreen";

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
      <Spacer h={16} />
      <SubscriptionTree subscriptions={subs} />
    </Container>
  );
}

function SubscriptionTree({
  subscriptions
}: {
  subscriptions: SubscriptionManager;
}) {
  const byProvider = useMemo(() => {
    return Array.from(subscriptions.getSubscriptionsByProvider().entries());
  }, [subscriptions]);

  return (
    <div>
      {byProvider.map(([providerUrl, subscriptionsList]) => (
        <SingleProvider
          key={providerUrl}
          subscriptions={subscriptions}
          providerUrl={providerUrl}
          subscriptionsList={subscriptionsList}
        />
      ))}
    </div>
  );
}

function SingleProvider({
  subscriptions,
  subscriptionsList,
  providerUrl
}: {
  subscriptions: SubscriptionManager;
  providerUrl: string;
  subscriptionsList: ActiveSubscription[];
}) {
  return (
    <ProviderContainer>
      {providerUrl}
      <Spacer h={16} />
      {subscriptionsList.map((s) => (
        <SubscriptionInfoRow
          key={s.feed.id}
          providerUrl={providerUrl}
          info={s.feed}
          subscriptions={subscriptions}
        />
      ))}
    </ProviderContainer>
  );
}

const Container = styled.div`
  padding: 64px;
`;

const ProviderContainer = styled.div`
  border: 1px solid white;
  border-radius: 12px;
  padding: 16px;
`;
