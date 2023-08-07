import {
  GetSubscriptionInfosResponse,
  SubscriptionInfo,
  SubscriptionManager
} from "@pcd/passport-interface";
import { useCallback, useState } from "react";
import styled from "styled-components";
import { appConfig } from "../../src/appConfig";
import { useSubscriptions } from "../../src/appHooks";
import { BigInput, Button, Spacer } from "../core";

async function fetchSubscriptionInfos(
  url: string
): Promise<SubscriptionInfo[]> {
  const result = await fetch(url);
  const parsed = (await result.json()) as GetSubscriptionInfosResponse;
  return parsed.infos;
}

const DEFAULT_URL = appConfig.passportServer + "/issuance/feeds";

export function AddSubscriptionScreen() {
  const [url, setUrl] = useState(DEFAULT_URL);
  const [infos, setInfos] = useState<SubscriptionInfo[] | undefined>();
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

    fetchSubscriptionInfos(url)
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
  }, [fetched, fetching, url]);

  return (
    <SubscriptionsScreenContainer>
      here you can add a new subscription
      <Spacer h={16} />
      <BigInput
        disabled={fetching || fetched}
        value={url}
        onChange={(e) => {
          setUrl(e.target.value);
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
            <SubscriptionInfoRow
              subscriptions={subs}
              url={url}
              info={info}
              key={i}
            />
          ))}
      </div>
    </SubscriptionsScreenContainer>
  );
}

function SubscriptionInfoRow({
  subscriptions,
  url,
  info
}: {
  subscriptions: SubscriptionManager;
  url: string;
  info: SubscriptionInfo;
}) {
  const onSubscribeClick = useCallback(() => {
    if (!confirm("are you sure you want to subscribe to this feed?")) return;

    subscriptions.subscribe(url, info);
  }, [info, subscriptions, url]);

  const existingSubscription = subscriptions.getSubscription(url, info.id);
  const alreadySubscribed = !!existingSubscription;

  return (
    <InfoRowContainer>
      id: {info.id}
      <br />
      description: {info.description} <br />
      you send a: {info.inputPCDType}
      <br />
      <Spacer h={8} />
      {alreadySubscribed ? (
        <AlreadySubscribed />
      ) : (
        <Button onClick={onSubscribeClick} size="small">
          Subscribe
        </Button>
      )}
    </InfoRowContainer>
  );
}

function AlreadySubscribed() {
  return <div></div>;
}

const InfoRowContainer = styled.div`
  padding: 16px;
  border: 1px solid white;
  border-radius: 12px;
`;

const SubscriptionsScreenContainer = styled.div`
  padding: 64px;
`;
