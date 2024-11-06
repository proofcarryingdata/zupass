import { ReactElement, useEffect, useState } from "react";
import { useIsSyncSettled } from "../../../src/appHooks";
import { NewLoader } from "../../shared/NewLoader";
import { Typography } from "../../shared/Typography";

export const SyncIndicator = (): ReactElement => {
  const [minutesSinceSynced, setMinutesSinceSynced] = useState(0);
  const isSyncSettled = useIsSyncSettled();

  useEffect(() => {
    const interval = setInterval(() => {
      if (isSyncSettled) {
        setMinutesSinceSynced((oldValue) => oldValue + 1);
      } else {
        setMinutesSinceSynced(0);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [isSyncSettled]);

  if (isSyncSettled) {
    if (minutesSinceSynced) {
      return (
        <Typography color="var(--text-tertiary)">
          Synced {minutesSinceSynced} minute
          {minutesSinceSynced > 1 ? "s" : ""} ago
        </Typography>
      );
    } else {
      return <Typography color="var(--text-tertiary)">Just synced</Typography>;
    }
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
