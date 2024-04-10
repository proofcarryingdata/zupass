import { useEffect, useState } from "react";
import urljoin from "url-join";
import { BallotConfig, ZupollError } from "../../types";
import {
  getHistoricGroupUrl,
  getLatestSemaphoreGroupHash
} from "../../zupoll-server-api";

export function useHistoricSemaphoreUrl(
  ballotConfig: BallotConfig | undefined,
  onError: (error: ZupollError) => void
): HistoricSemaphoreUrl {
  const [loading, setLoading] = useState(true);
  const [rootHash, setRootHash] = useState<string | null>(null);
  const semaphoreGroupId = ballotConfig?.voterGroupId ?? "";
  const semaphoreGroupServer = ballotConfig?.passportServerUrl ?? "";
  useEffect(() => {
    if (
      !ballotConfig ||
      !ballotConfig.passportServerUrl ||
      !ballotConfig.voterGroupId
    ) {
      setLoading(false);
      return;
    }
    const semaphoreGroupId = ballotConfig.voterGroupId;
    const semaphoreGroupServer = ballotConfig.passportServerUrl;
    const groupHashUrl = ballotConfig.latestGroupHashUrl
      ? ballotConfig.latestGroupHashUrl
      : urljoin(
          semaphoreGroupServer,
          `semaphore/latest-root/${encodeURIComponent(semaphoreGroupId)}`
        );
    getLatestSemaphoreGroupHash(groupHashUrl)
      .then((hash) => setRootHash(hash))
      .catch((e: Error) => {
        console.log(e);
        onError({
          message: "Failed to load historic Semaphore Group",
          title: "Loading Error"
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [onError, ballotConfig]);

  return {
    loading,
    rootHash,
    groupUrl:
      ballotConfig?.passportServerUrl && ballotConfig.voterGroupId
        ? rootHash &&
          (ballotConfig.makeHistoricalGroupUrl
            ? ballotConfig.makeHistoricalGroupUrl(rootHash)
            : getHistoricGroupUrl(
                semaphoreGroupId,
                rootHash,
                semaphoreGroupServer
              ))
        : null
  };
}

export interface HistoricSemaphoreUrl {
  loading: boolean;
  rootHash: string | null;
  groupUrl: string | null;
}
