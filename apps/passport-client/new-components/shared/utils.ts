import { serializeStorage } from "@pcd/passport-interface";
import { useCallback } from "react";
import {
  usePCDCollection,
  useSelf,
  useSubscriptions
} from "../../src/appHooks";

export const useExport = (): (() => Promise<void>) => {
  const user = useSelf();
  const pcds = usePCDCollection();
  const subscriptions = useSubscriptions();

  return useCallback(async () => {
    if (!user) return;
    // Since we already use this data for remote sync, we know that it's
    // sufficient for loading an account on to a new device.
    const { serializedStorage, storageHash } = await serializeStorage(
      user,
      pcds,
      subscriptions.value
    );

    // Data in a data URL must be Base64-encoded
    const data = Buffer.from(JSON.stringify(serializedStorage)).toString(
      "base64"
    );

    // Trigger the download
    const link = document.createElement("a");
    link.href = `data://text/json;base64,${data}`;
    link.download = `zupass-${storageHash}.json`;
    link.click();
    link.remove();
  }, [user, pcds, subscriptions]);
};

export const isMobile = /Mobi|Android/i.test(navigator.userAgent);
