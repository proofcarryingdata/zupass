import { ReactNode, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useDispatch, useEmbeddedScreenState } from "../../../src/appHooks";
import { ListenMode, useZappServer } from "../../../src/zapp/useZappServer";
import { AdhocModal } from "../../modals/AdhocModal";
import { EmbeddedScreen } from "../EmbeddedScreens/EmbeddedScreen";

export function ZappScreen({ url }: { url: string }): ReactNode {
  const [searchParams] = useSearchParams();
  const [iframeUrl, setIframeUrl] = useState<URL | null>(null);
  const [hasCleanedUrl, setHasCleanedUrl] = useState<boolean>(false);

  useEffect(() => {
    if (hasCleanedUrl) {
      return;
    }

    const urlWithOptionalParameters = new URL(url);

    // Copy all search params to forward into Zapp except 'folder'
    searchParams.forEach((value, key) => {
      if (key !== "folder") {
        urlWithOptionalParameters.searchParams.set(key, value);
      }
    });

    setHasCleanedUrl(true);
    setIframeUrl(urlWithOptionalParameters);
    window.location.href = cleanUrl(window.location.href);
  }, [url, searchParams, hasCleanedUrl]);

  return (
    <>
      <ZappModal />
      {iframeUrl && (
        <iframe
          loading="eager"
          style={{
            width: "100%",
            height: "100%"
          }}
          src={iframeUrl.toString()}
          sandbox="allow-downloads allow-same-origin allow-scripts allow-popups allow-modals allow-forms allow-storage-access-by-user-activation allow-popups-to-escape-sandbox"
        />
      )}
    </>
  );
}

function ZappModal(): ReactNode {
  useZappServer(ListenMode.LISTEN_IF_NOT_EMBEDDED);
  const embeddedScreen = useEmbeddedScreenState();
  const dispatch = useDispatch();
  return (
    <AdhocModal
      open={embeddedScreen?.screen !== undefined}
      onClose={() => {
        dispatch({
          type: "hide-embedded-screen"
        });
      }}
    >
      <EmbeddedScreen />
    </AdhocModal>
  );
}

/**
 * Get the URL with all but the `folder` query string parameter removed
 * from the hash (since we use `HashRouter`).
 */
function cleanUrl(href: string): string {
  try {
    const currentUrl = new URL(href);
    if (currentUrl.hash) {
      const hashPart = currentUrl.hash.substring(1);
      const tempUrl = new URL(`http://example.com${hashPart}`);
      const folderParam = tempUrl.searchParams.get("folder");
      let newHash = tempUrl.pathname;
      if (folderParam) {
        newHash += `?folder=${folderParam}`;
      } else {
        newHash += "";
      }
      currentUrl.hash = newHash;
    }

    return currentUrl.toString();
  } catch (e) {
    return href;
  }
}
