import { ReactElement, useEffect, useState } from "react";
import { NewLoader } from "../../../../../packages/lib/passport-ui/src/NewLoader";
import {
  useExtraSubscriptionFetchRequested,
  useIsSyncSettled
} from "../../../src/appHooks";
import { Typography } from "../../shared/Typography";

const syncStates = {
  now: (_: number): string => "Synced just now",
  near: (_: number): string => "Synced a few seconds ago",
  aboutMinute: (_: number): string => "Synced about a minute ago",
  minutes: (seconds: number): string => `Synced ${seconds / 60} minutes ago`
} as const;

const getSyncState = (seconds: number): keyof typeof syncStates => {
  switch (true) {
    case seconds <= 10:
      return "now";
    case seconds <= 50:
      return "near";
    case seconds <= 120:
      return "aboutMinute";
    default:
      return "minutes";
  }
};
export const SyncIndicator = (): ReactElement => {
  const [syncState, setSyncState] = useState<string | undefined>();

  const extraFetchSubscriptionRequested = useExtraSubscriptionFetchRequested();
  const isSyncSettled = useIsSyncSettled();
  const isBackgroundSyncSettled =
    isSyncSettled && !extraFetchSubscriptionRequested;

  useEffect(() => {
    let seconds = 0;
    const interval = setInterval(() => {
      if (isBackgroundSyncSettled) {
        seconds += 10;
        setSyncState(syncStates[getSyncState(seconds)](seconds));
      } else {
        setSyncState(undefined);
        seconds = 0;
      }
    }, 10000);

    if (isBackgroundSyncSettled) {
      seconds += 10;
      setSyncState(syncStates[getSyncState(seconds)](seconds));
    } else {
      setSyncState(undefined);
      seconds = 0;
    }
    return () => clearInterval(interval);
  }, [isBackgroundSyncSettled]);

  if (isBackgroundSyncSettled && syncState) {
    return <Typography color="var(--text-tertiary)">{syncState}</Typography>;
  }
  return (
    <Typography
      color="var(--text-tertiary)"
      style={{ display: "flex", alignItems: "center", gap: 4 }}
    >
      <NewLoader size={2} gap={1} rows={3} columns={3} />
      Syncing
    </Typography>
  );
};
