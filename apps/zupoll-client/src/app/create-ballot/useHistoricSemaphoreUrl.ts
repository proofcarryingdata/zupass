import { BallotConfig, BallotType } from "@pcd/zupoll-shared";
import { useEffect, useState } from "react";
import urljoin from "url-join";
import { ZupollError } from "../../types";
import { getLatestSemaphoreGroupHash } from "../../zupoll-server-api";

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

  let groupUrl: string | null = null;
  if (
    ballotConfig?.passportServerUrl &&
    ballotConfig.voterGroupId &&
    rootHash &&
    ballotConfig.makeHistoricalGroupUrl
  ) {
    groupUrl = ballotConfig.makeHistoricalGroupUrl(rootHash);
  } else if (ballotConfig?.ballotType === BallotType.PODBOX && rootHash) {
    groupUrl = urljoin(ballotConfig.voterGroupUrl, rootHash);
  }

  return {
    loading,
    rootHash,
    groupUrl
  };
}

export interface HistoricSemaphoreUrl {
  loading: boolean;
  rootHash: string | null;
  groupUrl: string | null;
}
