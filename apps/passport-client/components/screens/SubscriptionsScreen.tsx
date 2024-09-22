import { Emitter } from "@pcd/emitter";
import { FeedSubscriptionManager, Subscription } from "@pcd/passport-interface";
import React, { useCallback, useMemo } from "react";
import styled from "styled-components";
import { useLoginIfNoSelf, useSubscriptions } from "../../src/appHooks";
import { pendingRequestKeys } from "../../src/sessionStorage";
import { useSyncE2EEStorage } from "../../src/useSyncE2EEStorage";
import { Button, Spacer } from "../core";
import { MaybeModal } from "../modals/Modal";
import { AppContainer } from "../shared/AppContainer";
import { Overscroll } from "../shared/Overscroll";
import { ScreenNavigation } from "../shared/ScreenNavigation";
import { SubscriptionInfoRow } from "./AddSubscriptionScreen";

export function SubscriptionsScreen(): JSX.Element {
  useSyncE2EEStorage();
  const { value: subs } = useSubscriptions();
  const closeEmitter = useMemo(() => {
    return new Emitter<unknown>();
  }, []);

  useLoginIfNoSelf(pendingRequestKeys.viewSubscriptions);

  const onAddNewClicked = useCallback(() => {
    window.location.href = "/#/add-subscription";
  }, []);

  return (
    <>
      <MaybeModal />
      <Overscroll />
      <AppContainer bg="primary">
        <ScreenNavigation label={"Home"} to="/" />
        <Spacer h={8} />
        <Button onClick={onAddNewClicked}>Add Subscription</Button>
        <Spacer h={8} />
        <Container>
          <p>
            Feed subscriptions allow Zupass to access PCDs from the internet!
            You can subscribe to feeds hosted by third party developers.
          </p>
          <Spacer h={8} />
          <p>
            To create your own PCD feed, you can either implement, host, and
            maintain your own{" "}
            <a href="https://github.com/proofcarryingdata/zupass/tree/main/test-packaging/zupass-feed-server">
              feed server
            </a>
            .
          </p>
          <Spacer h={8} />
          <p>Your subscriptions are:</p>
          <Spacer h={8} />
          {subs.getActiveSubscriptions().length === 0 && (
            <div>You have no subscriptions.</div>
          )}
          <SubscriptionTree subscriptions={subs} closeEmitter={closeEmitter} />
        </Container>
        <Spacer h={512} />
      </AppContainer>
    </>
  );
}

function SubscriptionTree({
  subscriptions,
  closeEmitter
}: {
  subscriptions: FeedSubscriptionManager;
  closeEmitter: Emitter<unknown>;
}): JSX.Element {
  const byProvider = Array.from(
    subscriptions.getSubscriptionsByProvider().entries()
  );

  return (
    <>
      {byProvider.map(([providerUrl, subscriptionsList]) => (
        <SingleProvider
          closeEmitter={closeEmitter}
          key={providerUrl}
          subscriptions={subscriptions}
          providerUrl={providerUrl}
          subscriptionsList={subscriptionsList}
        />
      ))}
    </>
  );
}

function SingleProvider({
  subscriptions,
  subscriptionsList,
  providerUrl,
  closeEmitter
}: {
  subscriptions: FeedSubscriptionManager;
  providerUrl: string;
  subscriptionsList: Subscription[];
  closeEmitter?: Emitter<unknown>;
}): JSX.Element {
  const providerName = subscriptions?.getProvider(providerUrl)?.providerName;
  return (
    <>
      {subscriptionsList.map((s) => (
        <React.Fragment key={s.id}>
          <Spacer h={8} />
          <SubscriptionInfoRow
            providerUrl={providerUrl}
            providerName={providerName ?? ""}
            info={s.feed}
            subscriptions={subscriptions}
            showErrors={!s.ended}
            isDeepLink={false}
            onClose={closeEmitter}
          />
        </React.Fragment>
      ))}
    </>
  );
}

const Container = styled.div`
  padding-bottom: 128px;
  padding-top: 16px;
`;
