import {
  GetSubscriptionInfosResponse,
  SubscriptionInfo
} from "@pcd/passport-interface";
import { useCallback, useState } from "react";
import { appConfig } from "../../src/appConfig";
import { BigInput, Button } from "../core";

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

  const onClick = useCallback(() => {
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
    <div>
      here you can add a new subscription
      <BigInput
        disabled={fetching || fetched}
        value={url}
        onChange={(e) => {
          setUrl(e.target.value);
        }}
      />
      <Button disabled={fetching || fetched} onClick={onClick}>
        Get possible subscriptions
      </Button>
      <div>{fetchError && <>error: {fetchError.message}</>}</div>
      <div>
        {infos &&
          infos.map((info, i) => (
            <SubscriptionInfoRow url={url} info={info} key={i} />
          ))}
      </div>
    </div>
  );
}

function SubscriptionInfoRow({
  url,
  info
}: {
  url: string;
  info: SubscriptionInfo;
}) {
  return <div>{info.description}</div>;
}
