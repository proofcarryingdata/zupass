import { FeedSubscriptionManager, Subscription } from "@pcd/passport-interface";
import React, { useCallback } from "react";
import styled from "styled-components";
import { useSubscriptions } from "../../src/appHooks";
import { Button, H2, Spacer } from "../core";
import { MaybeModal } from "../modals/Modal";
import { AppContainer } from "../shared/AppContainer";
import { SubscriptionNavigation } from "../shared/SubscriptionNavigation";
import { SubscriptionInfoRow } from "./AddSubscriptionScreen";

export function SubscriptionsScreen() {
  const { value: subs } = useSubscriptions();

  const onAddNewClicked = useCallback(() => {
    window.location.href = "/#/add-subscription";
  }, []);

  return (
    <AppContainer bg="gray">
      <MaybeModal />
      <SubscriptionNavigation to="/"></SubscriptionNavigation>
      <Container>
        <H2>Your Subscriptions</H2>
        <Spacer h={32} />
        <Button onClick={onAddNewClicked}>Add a new subscription</Button>
        <Spacer h={16} />
        {subs.getActiveSubscriptions().length === 0 && (
          <div>You have no subscriptions.</div>
        )}
        <SubscriptionTree subscriptions={subs} />
      </Container>
    </AppContainer>
  );
}

function SubscriptionTree({
  subscriptions
}: {
  subscriptions: FeedSubscriptionManager;
}) {
  const byProvider = Array.from(
    subscriptions.getSubscriptionsByProvider().entries()
  );

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
  subscriptions: FeedSubscriptionManager;
  providerUrl: string;
  subscriptionsList: Subscription[];
}) {
  const providerName = subscriptions.getProvider(providerUrl).providerName;
  return (
    <ProviderContainer>
      <ProviderHeader>
        Subscriptions provided by <ProviderName>{providerUrl}</ProviderName>
      </ProviderHeader>
      <Spacer h={8} />
      {subscriptionsList.map((s) => (
        <React.Fragment key={s.id}>
          <Spacer h={16} />
          <SubscriptionInfoRow
            providerUrl={providerUrl}
            providerName={providerName}
            info={s.feed}
            credential={s.credential}
            subscriptions={subscriptions}
            showErrors={true}
          />
        </React.Fragment>
      ))}
    </ProviderContainer>
  );
}

const ProviderHeader = styled.div``;

const ProviderName = styled.span`
  font-weight: bold;
`;

const Container = styled.div`
  padding-bottom: 16px;
  padding-top: 16px;
`;

const ProviderContainer = styled.div``;
