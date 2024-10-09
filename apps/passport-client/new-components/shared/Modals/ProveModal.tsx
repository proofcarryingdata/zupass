import React, { ReactElement } from "react";
import { BottomModal } from "../BottomModal";
import { useBottomModal } from "../../../src/appHooks";
import { Typography } from "../Typography";

export const ProveModal = (): ReactElement | null => {
  const activeModal = useBottomModal();

  if (activeModal.modalType !== "prove") {
    return null;
  }
  return (
    <BottomModal dismissable={false} isOpen={activeModal.modalType === "prove"}>
      <Typography>hello, world!</Typography>
    </BottomModal>
  );
};
