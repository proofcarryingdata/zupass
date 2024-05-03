import { BallotConfig, BallotType } from "@pcd/zupoll-shared";
import { useEffect, useState } from "react";
import urljoin from "url-join";
import { ZupollError } from "../../types";
import { getLatestSemaphoreGroupRoot } from "../../zupoll-server-api";

export function useHistoricVoterSemaphoreUrl(
  ballotConfig: BallotConfig | undefined,
  onError: (error: ZupollError) => void
): HistoricVoterSemaphoreUrl {
  const [loading, setLoading] = useState(true);
  const [latestVoterGroupRootHash, setLatestVoterGroupHash] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (
      !ballotConfig ||
      !ballotConfig.passportServerUrl ||
      !ballotConfig.voterGroupId
    ) {
      setLoading(false);
      return;
    }

    const voterLatestRootUrl = ballotConfig.latestVoterGroupHashUrl
      ? ballotConfig.latestVoterGroupHashUrl
      : urljoin(
          ballotConfig.passportServerUrl,
          `semaphore/latest-root/${encodeURIComponent(
            ballotConfig.voterGroupId
          )}`
        );

    getLatestSemaphoreGroupRoot(voterLatestRootUrl)
      .then((hash) => setLatestVoterGroupHash(hash))
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

  let voterGroupUrl: string | null = null;

  if (
    latestVoterGroupRootHash &&
    ballotConfig?.passportServerUrl &&
    ballotConfig.voterGroupId &&
    ballotConfig.makeHistoricVoterGroupUrl
  ) {
    voterGroupUrl = ballotConfig.makeHistoricVoterGroupUrl(
      latestVoterGroupRootHash
    );
  } else if (
    ballotConfig?.ballotType === BallotType.PODBOX &&
    latestVoterGroupRootHash
  ) {
    voterGroupUrl = urljoin(
      ballotConfig.voterGroupUrl,
      latestVoterGroupRootHash
    );
  }

  return {
    loading,
    rootHash: latestVoterGroupRootHash,
    voterGroupUrl
  };
}

export interface HistoricVoterSemaphoreUrl {
  loading: boolean;
  rootHash: string | null;
  voterGroupUrl: string | null;
}
