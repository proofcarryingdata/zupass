import { Biome } from "@pcd/eddsa-frog-pcd";
import {
  FrogCryptoDbFeedData,
  FrogCryptoDbFeedDataSchema,
  FrogCryptoFeedBiomeConfigs,
  requestFrogCryptoUpdateFeeds
} from "@pcd/passport-interface";
import { ErrorMessage, Separator } from "@pcd/passport-ui";
import { SerializedPCD } from "@pcd/pcd-types";
import { getErrorMessage } from "@pcd/util";
import chain from "lodash/chain";
import upperFirst from "lodash/upperFirst";
import prettyMilliseconds from "pretty-ms";
import { useEffect, useMemo, useState } from "react";
// react-table-lite does not have types
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import Table from "react-table-lite";
import styled from "styled-components";
import { appConfig } from "../../../src/appConfig";
import { useCredentialManager } from "../../../src/appHooks";
import { useAdminError } from "./useAdminError";

export function ManageFeedsSection(): JSX.Element {
  const [newFeedsText, setNewFeedsText] = useState<string>("");
  const onTextChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>
  ): void => {
    setNewFeedsText(event.target.value);
  };
  const { newFeeds, newFeedsError } = useMemo(() => {
    if (!newFeedsText.trim()) {
      return {
        newFeeds: [],
        newFeedsError: undefined
      };
    }

    try {
      const parsedData = feedParser(newFeedsText);
      return {
        newFeeds: parsedData,
        newFeedsError: undefined
      };
    } catch (error) {
      return {
        newFeeds: [],
        newFeedsError: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }, [newFeedsText]);

  const { result: feeds, isLoading, updateFeeds, error } = useFeeds();

  useAdminError(error);

  return (
    <>
      <h2>Add New Feeds</h2>
      <p>
        Go to the Feeds tab of the Frog data spreadsheet, click on Export JSON
        in the toolbar, and copy the generated JSON representation of feeds.
      </p>
      <textarea rows={10} value={newFeedsText} onChange={onTextChange} />
      {newFeedsError && (
        <ErrorMessage>Error parsing feeds: {newFeedsError}</ErrorMessage>
      )}

      {newFeeds.length > 0 && (
        <>
          <h2>(Preview) New/Updated Feeds</h2>
          <DataTable data={newFeeds} />
          <button onClick={(): void => updateFeeds(newFeeds)}>
            Add/Update Feeds
          </button>
        </>
      )}

      <Separator />

      <h2>Feeds</h2>
      {isLoading && <p>Loading...</p>}
      {error && <ErrorMessage>Error fetching feeds: {error}</ErrorMessage>}
      <DataTable
        data={feeds}
        onEditFeed={(feed): void => {
          setNewFeedsText(feedUnparser([feed]));
        }}
      />
    </>
  );
}

function useFeeds(): {
  /**
   * All the feeds in the database. This always reflects the latest state of the database
   * after last request made here.
   */
  result: FrogCryptoDbFeedData[];
  isLoading: boolean;
  error: string | undefined;
  /**
   * Call this to upsert (replace) feeds in the database.
   */
  updateFeeds: (feeds: FrogCryptoDbFeedData[]) => void;
} {
  const [result, setResult] = useState<FrogCryptoDbFeedData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  const credentialManager = useCredentialManager();
  const [pcd, setPcd] = useState<SerializedPCD>();
  useEffect(() => {
    const fetchPcd = async (): Promise<void> => {
      const pcd = await credentialManager.requestCredential({
        signatureType: "sempahore-signature-pcd"
      });
      setPcd(pcd);
    };
    fetchPcd();
  }, [credentialManager]);

  const [req, setReq] = useState<
    { type: "load" } | { type: "update"; feeds: FrogCryptoDbFeedData[] }
  >({ type: "load" });

  // ensure only one request is in flight at a time
  useEffect(() => {
    const abortController = new AbortController();

    const doRequest = async (): Promise<void> => {
      if (!pcd) {
        setError("Waiting for PCD to be ready");
        return;
      }

      try {
        setError(undefined);
        setIsLoading(true);

        let result;
        switch (req.type) {
          case "load":
            result = await requestFrogCryptoUpdateFeeds(
              appConfig.zupassServer,
              {
                pcd,
                feeds: []
              }
            );
            break;
          case "update":
            result = await requestFrogCryptoUpdateFeeds(
              appConfig.zupassServer,
              { pcd, feeds: req.feeds }
            );
            break;
        }

        if (abortController.signal.aborted) {
          return;
        }
        if (result.success) {
          setResult(result.value.feeds);
        } else {
          setError(result.error);
        }
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }
        setError(getErrorMessage(error));
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    };
    doRequest();

    return () => {
      abortController.abort();
    };
  }, [pcd, req]);

  return {
    result,
    isLoading,
    error,
    updateFeeds: (feeds) => setReq({ type: "update", feeds })
  };
}

/**
 * Parses the data from the feed spreadsheet into a format that can be used by the
 * `requestFrogCryptoUpdateFeeds` API.
 *
 * @param data The data from the frog spreadsheet as a JSON array of Record<attr name, attr val>.
 */
function feedParser(data: string): FrogCryptoDbFeedData[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return JSON.parse(data).map((rawFeed: any) => {
    // e.g. biomesPutridswampDropweightscaler => biomes.PutridSwamp.dropWeightScaler
    const parseBiomes = (
      rawFeed: Record<string, string | undefined>
    ): FrogCryptoFeedBiomeConfigs =>
      Object.keys(Biome).reduce((acc, biome) => {
        const dropWeightScaler =
          rawFeed[
            `biomes${upperFirst(
              biome.replace(/\s/, "").toLowerCase()
            )}Dropweightscaler`
          ];
        if (typeof dropWeightScaler !== "undefined" && +dropWeightScaler > 0) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          acc[biome] = {
            dropWeightScaler: Number.parseFloat(dropWeightScaler)
          };
        }
        return acc;
      }, {} as FrogCryptoFeedBiomeConfigs);

    const feedData = {
      uuid: rawFeed.uuid,
      feed: {
        name: rawFeed.name,
        description: rawFeed.description,
        private: Boolean(rawFeed.private),
        activeUntil: Math.round(new Date(rawFeed.activeUntil).getTime() / 1000),
        cooldown: Number.parseInt(rawFeed.cooldown),
        biomes: parseBiomes(rawFeed),
        codes: rawFeed.codes
          ?.split(",")
          ?.map((code: string) => code.trim())
          ?.filter(Boolean)
      }
    } satisfies FrogCryptoDbFeedData;

    try {
      FrogCryptoDbFeedDataSchema.parse(feedData);
    } catch (e) {
      console.error(e);
      throw new Error(`Invalid feed data: ${JSON.stringify(feedData)}`);
    }

    return feedData;
  });
}

/**
 * Unparses the data from db schema to the raw feed spreadsheet format for easy editing.
 */
function feedUnparser(feeds: FrogCryptoDbFeedData[]): string {
  return JSON.stringify(
    feeds.map((feed) => ({
      uuid: feed.uuid,
      name: feed.feed.name,
      description: feed.feed.description,
      private: feed.feed.private,
      activeUntil: new Date(feed.feed.activeUntil * 1000).toISOString(),
      cooldown: feed.feed.cooldown,
      ...Object.keys(Biome).reduce<Record<string, number>>((acc, biome) => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const biomeConfig = feed.feed.biomes[biome];
        if (biomeConfig) {
          acc[
            `biomes${upperFirst(
              biome.replace(/\s/, "").toLowerCase()
            )}Dropweightscaler`
          ] = biomeConfig.dropWeightScaler;
        }
        return acc;
      }, {}),
      codes: feed.feed.codes?.join(",")
    })),
    null,
    2
  );
}

export function DataTable({
  data: rawData,
  onEditFeed
}: {
  data: FrogCryptoDbFeedData[];
  onEditFeed?: (feed: FrogCryptoDbFeedData) => void;
}): JSX.Element {
  const data = rawData.map(({ uuid, feed }) => ({
    uuid,
    ...feed
  }));
  const keys =
    data.length > 0
      ? chain(data).map(Object.keys).flatten().uniq().value()
      : [];

  return (
    <Table
      data={data}
      headers={keys}
      customHeaders={{
        cooldown: "cooldown (sec)",
        activeUntil: "activeUntil (unix timestamp sec)"
      }}
      showActions={!!onEditFeed}
      head
      actionTypes={["edit"]}
      noDataMessage="No Feeds"
      customRenderCell={{
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...keys.reduce<Record<string, (row: any) => any>>((acc, key) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          acc[key] = (row: any): any => {
            return typeof row[key] === "undefined" ? "<undefined>" : row[key];
          };
          return acc;
        }, {}),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        private: (row: any): string => {
          return String(row["private"]);
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        activeUntil: (row: any): JSX.Element | string => {
          const activeUntil = row["activeUntil"];
          if (!activeUntil) {
            return "<undefined>";
          }
          const duration = activeUntil * 1000 - Date.now();

          return (
            <div>
              <p>
                <b>Raw: </b>
                {activeUntil}
              </p>
              <p>
                <b>Date: </b>
                {new Date(activeUntil * 1000).toISOString()}
              </p>
              {duration > 0 ? (
                <p>
                  <b>Active for: </b>
                  {prettyMilliseconds(duration, {
                    compact: true
                  })}
                </p>
              ) : (
                <p>
                  <b>Expired: </b>
                  {prettyMilliseconds(-duration, {
                    compact: true
                  })}{" "}
                  ago
                </p>
              )}
            </div>
          );
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        description: (row: any): JSX.Element => {
          return (
            <Description title={row["description"]}>
              {row["description"]}
            </Description>
          );
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        biomes: (row: any): JSX.Element | string => {
          const biomes = row["biomes"];
          if (!biomes) {
            return "<undefined>";
          }
          return (
            <div>
              {Object.keys(biomes).map((biome) => (
                <p key={biome}>
                  {biome}: {JSON.stringify(biomes[biome])}
                </p>
              ))}
            </div>
          );
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        codes: (row: any): JSX.Element | string => {
          const codes = row["codes"];
          if (!codes) {
            return "<undefined>";
          }
          return (
            <div>
              {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                codes.map((code: any) => (
                  <p key={code}>{code}</p>
                ))
              }
            </div>
          );
        }
      }}
      containerStyle={{ maxHeight: "400px", overflow: "auto" }}
      cellStyle={{ padding: "8px" }}
      headerStyle={{ padding: "8px" }}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onRowEdit={(args: any, row: any): void => {
        const feed = rawData.find((feed) => feed.uuid === row.uuid);
        if (feed) {
          onEditFeed?.(feed);
        }
      }}
    />
  );
}

const Description = styled.span`
  display: -webkit-box;
  max-width: 300px;
  -webkit-line-clamp: 5;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
`;
