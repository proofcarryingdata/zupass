import {
  Feed,
  FeedSubscriptionManager,
  ISSUANCE_STRING,
  Subscription
} from "@pcd/passport-interface";
import { PCDPermission } from "@pcd/pcd-collection";
import { ArgumentTypeName, SerializedPCD } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd/";
import { useCallback, useState } from "react";
import styled from "styled-components";
import { appConfig } from "../../src/appConfig";
import {
  useIdentity,
  usePCDCollection,
  useSubscriptions
} from "../../src/appHooks";
import { BigInput, Button, Spacer } from "../core";

const DEFAULT_FEEDS_URL = appConfig.passportServer + "/feeds";

export function AddSubscriptionScreen() {
  const [providerUrl, setProviderUrl] = useState(DEFAULT_FEEDS_URL);
  const [infos, setInfos] = useState<Feed[] | undefined>();
  const [fetching, setFetching] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [fetchError, setFetchError] = useState<Error | undefined>();
  const { value: subs } = useSubscriptions();

  const onFetchFeedsClick = useCallback(() => {
    if (fetching || fetched) {
      return;
    }

    setFetched(false);
    setFetching(true);
    setFetchError(undefined);

    subs
      .listFeeds(providerUrl)
      .then((infos) => {
        setFetched(true);
        setFetching(false);
        setInfos(infos);
      })
      .catch((e) => {
        console.log(`error fetching subscription infos ${e}`);
        setFetched(false);
        setFetching(false);
        setFetchError(e);
      });
  }, [fetched, fetching, providerUrl, subs]);

  const onBackClick = useCallback(() => {
    window.location.href = "/#/subscriptions";
  }, []);

  return (
    <SubscriptionsScreenContainer>
      <Button disabled={fetching || fetched} onClick={onBackClick}>
        Back to manager
      </Button>
      <Spacer h={16} />
      here you can add a new subscription
      <Spacer h={16} />
      <BigInput
        disabled={fetching || fetched}
        value={providerUrl}
        onChange={(e) => {
          setProviderUrl(e.target.value);
        }}
      />
      <Spacer h={16} />
      <Button disabled={fetching || fetched} onClick={onFetchFeedsClick}>
        Get possible subscriptions
      </Button>
      <Spacer h={16} />
      <div>{fetchError && <>error: {fetchError.message}</>}</div>
      <div>
        {infos &&
          infos.map((info, i) => (
            <>
              <Spacer h={8} />
              <SubscriptionInfoRow
                subscriptions={subs}
                providerUrl={providerUrl}
                info={info}
                key={i}
              />
            </>
          ))}
      </div>
    </SubscriptionsScreenContainer>
  );
}

export function SubscriptionInfoRow({
  subscriptions,
  providerUrl,
  info
}: {
  subscriptions: FeedSubscriptionManager;
  providerUrl: string;
  info: Feed;
}) {
  const existingSubscription = subscriptions.getSubscription(
    providerUrl,
    info.id
  );
  const alreadySubscribed = !!existingSubscription;

  return (
    <InfoRowContainer>
      id: {info.id}
      <br />
      description: {info.description} <br />
      {info.inputPCDType && <>you send a: {info.inputPCDType}</>} <br />
      <PermissionsView permissions={info.permissions} />
      <br />
      <Spacer h={8} />
      {alreadySubscribed ? (
        <AlreadySubscribed
          subscriptions={subscriptions}
          existingSubscription={existingSubscription}
        />
      ) : (
        <SubscribeSection
          subscriptions={subscriptions}
          providerUrl={providerUrl}
          info={info}
        />
      )}
    </InfoRowContainer>
  );
}

function SubscribeSection({
  subscriptions,
  providerUrl,
  info
}: {
  subscriptions: FeedSubscriptionManager;
  providerUrl: string;
  info: Feed;
}) {
  const identity = useIdentity();
  const [credential, setCredential] = useState<SerializedPCD | undefined>();

  const pcds = usePCDCollection();
  console.log("PCDS", pcds);

  const onSubscribeClick = useCallback(() => {
    if (!confirm("are you sure you want to subscribe to this feed?")) return;

    subscriptions.subscribe(providerUrl, info, credential);
  }, [subscriptions, providerUrl, info, credential]);

  const addCredential = useCallback(() => {
    (async () => {
      setCredential(
        await SemaphoreSignaturePCDPackage.serialize(
          await SemaphoreSignaturePCDPackage.prove({
            identity: {
              argumentType: ArgumentTypeName.PCD,
              value: await SemaphoreIdentityPCDPackage.serialize(
                await SemaphoreIdentityPCDPackage.prove({
                  identity: identity
                })
              )
            },
            signedMessage: {
              argumentType: ArgumentTypeName.String,
              value: ISSUANCE_STRING
            }
          })
        )
      );
    })();
  }, [identity]);

  return (
    <>
      <Button onClick={addCredential} size="small">
        Set Credential
      </Button>
      <Spacer w={8} />
      credential: {credential ? "✅" : "❌"}
      <Spacer h={8} />
      <Button onClick={onSubscribeClick} size="small">
        Subscribe
      </Button>
    </>
  );
}

export function PermissionsView({
  permissions
}: {
  permissions: PCDPermission[];
}) {
  return (
    <div>
      {permissions.map((p, i) => (
        <SinglePermission key={i} permission={p} />
      ))}
    </div>
  );
}

export function SinglePermission({
  permission
}: {
  permission: PCDPermission;
}) {
  return <div>{JSON.stringify(permission)}</div>;
}

function AlreadySubscribed({
  subscriptions,
  existingSubscription
}: {
  existingSubscription: Subscription;
  subscriptions: FeedSubscriptionManager;
}) {
  const onUnsubscribeClick = useCallback(() => {
    if (
      !window.confirm("are you sure you want to unsubscribe from this feed?")
    ) {
      return;
    }

    subscriptions.unsubscribe(
      existingSubscription.providerUrl,
      existingSubscription.feed.id
    );
  }, [
    existingSubscription.feed.id,
    existingSubscription.providerUrl,
    subscriptions
  ]);

  return (
    <div>
      You're already subscribed to this feed! <br />
      subscribed at{" "}
      {new Date(existingSubscription.subscribedTimestamp).toISOString()}
      <br />
      <Button onClick={onUnsubscribeClick} size="small" style="danger">
        Unsubscribe
      </Button>
    </div>
  );
}

const InfoRowContainer = styled.div`
  padding: 16px;
  border: 1px solid white;
  border-radius: 12px;
`;

const SubscriptionsScreenContainer = styled.div`
  padding: 64px;
`;
