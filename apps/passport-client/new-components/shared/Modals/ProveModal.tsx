import { ReactElement } from "react";
import { BottomModal } from "../BottomModal";
import { useBottomModal, useDispatch } from "../../../src/appHooks";
import { getScreen } from "../../../components/screens/ProveScreen/ProveScreen";

export const ProveModal = (): ReactElement | null => {
  const activeModal = useBottomModal();
  const dispatch = useDispatch();
  if (activeModal.modalType !== "prove" || !activeModal.request) {
    return null;
  }

  const view = getScreen(activeModal.request);
  if (!view) {
    dispatch({
      type: "set-bottom-modal",
      modal: { modalType: "none" }
    });
    dispatch({
      type: "error",
      error: {
        title: "Failed to login with zupass",
        dismissToCurrentPage: true,
        message: "The sign in process failed, please contact support"
      }
    });
    return null;
  }
  return (
    <BottomModal dismissable={false} isOpen={activeModal.modalType === "prove"}>
      {view}
    </BottomModal>
  );
};
