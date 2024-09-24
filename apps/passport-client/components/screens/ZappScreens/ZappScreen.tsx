import { ReactNode } from "react";
import { useDispatch, useEmbeddedScreenState } from "../../../src/appHooks";
import { ListenMode, useZappServer } from "../../../src/zapp/useZappServer";
import { AdhocModal } from "../../modals/AdhocModal";
import { EmbeddedScreen } from "../EmbeddedScreens/EmbeddedScreen";

export function ZappScreen({ url }: { url: string }): ReactNode {
  return (
    <>
      <ZappModal />
      <iframe
        style={{ width: "100%", height: "100%", borderRadius: "10px" }}
        src={url}
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
