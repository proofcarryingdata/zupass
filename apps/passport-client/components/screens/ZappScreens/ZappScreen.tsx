import { ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { useDispatch, useEmbeddedScreenState } from "../../../src/appHooks";
import { ListenMode, useZappServer } from "../../../src/zapp/useZappServer";
import { AdhocModal } from "../../modals/AdhocModal";
import { EmbeddedScreen } from "../EmbeddedScreens/EmbeddedScreen";

export function ZappScreen({ url }: { url: string }): ReactNode {
  const [searchParams] = useSearchParams();
  const urlWithOptionalParameter = new URL(url);

  // Copy all search params to forward into Zapp except 'folder'
  searchParams.forEach((value, key) => {
    if (key !== "folder") {
      urlWithOptionalParameter.searchParams.set(key, value);
    }
  });

  return (
    <>
      <ZappModal />
      <iframe
        loading="eager"
        style={{
          width: "100%",
          height: "100%"
        }}
        src={urlWithOptionalParameter.toString()}
        allow="camera;microphone;clipboard-read;clipboard-write"
        sandbox="allow-downloads allow-same-origin allow-scripts allow-popups allow-modals allow-forms allow-storage-access-by-user-activation allow-popups-to-escape-sandbox"
      />
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
