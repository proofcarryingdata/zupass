import { serializeStorage } from "@pcd/passport-interface";
import { useCallback, useEffect, useState } from "react";
import { css } from "styled-components";
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

export const useOrientation = (): ScreenOrientation => {
  const [state, setState] = useState<ScreenOrientation>(
    window.screen?.orientation ?? { type: "portrait-primary" }
  );

  useEffect(() => {
    const screen = window.screen;
    let mounted = true;

    const onChange = (): void => {
      if (mounted && screen.orientation) {
        const { orientation } = screen;

        setState(orientation);
      }
    };

    window.addEventListener("orientationchange", onChange);
    onChange();

    return (): void => {
      mounted = false;
      window.removeEventListener("orientationchange", onChange);
    };
  }, []);

  return state;
};

export const POD_FOLDER_DISPLAY_SEPERATOR = "·";

export const replaceDotWithSlash = (folderPath: string): string => {
  const splitted = folderPath.split(POD_FOLDER_DISPLAY_SEPERATOR);
  if (splitted.length === 1) return folderPath;

  for (let i = 0; i < splitted.length; i++) {
    splitted[i] = splitted[i].trim();
  }
  return splitted.join("/");
};

export const hideScrollCSS = css`
  &::-webkit-scrollbar {
    display: none;
  }
  -ms-overflow-style: none; /* IE and Edge */
  scrollbar-width: none; /* Firefox */
`;

declare global {
  interface Window {
    TelegramWebviewProxy: {
      postEvent: (...args: unknown[]) => unknown;
    };
  }
}

export const isInWebview = (): boolean =>
  !!window?.TelegramWebviewProxy?.postEvent;
