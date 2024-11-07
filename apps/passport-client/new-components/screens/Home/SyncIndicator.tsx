import { ReactElement, useEffect, useState } from "react";
import { useIsSyncSettled } from "../../../src/appHooks";
import { NewLoader } from "../../shared/NewLoader";
import { Typography } from "../../shared/Typography";

const syncStates = {
  now: (_: number): string => "Synced just now",
  near: (_: number): string => "Synced few seconds ago",
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
  const isSyncSettled = useIsSyncSettled();

  useEffect(() => {
    let seconds = 0;
    const interval = setInterval(() => {
      if (isSyncSettled) {
        seconds += 10;
        setSyncState(syncStates[getSyncState(seconds)](seconds));
      } else {
        setSyncState(undefined);
        seconds = 0;
      }
    }, 10000);

    if (isSyncSettled) {
      seconds += 10;
      setSyncState(syncStates[getSyncState(seconds)](seconds));
    } else {
      setSyncState(undefined);
      seconds = 0;
    }
    return () => clearInterval(interval);
  }, [isSyncSettled]);

  if (isSyncSettled && syncState) {
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
