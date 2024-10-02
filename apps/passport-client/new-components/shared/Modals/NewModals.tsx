import { useEffect } from "react";
import { useBottomModal } from "../../../src/appHooks";
import { AboutZupassModal } from "./AboutZupassModal";
import { ChangePasswordModal } from "./ChangePasswordModal";
import { DeleteAccountModal } from "./DeleteAccountModal";
import { ManageEmailModal } from "./ManageEmailsModal";
import { PodsCollectionBottomModal } from "./PodsCollectionBottomModal";
import { SettingsBottomModal } from "./SettingsBottomModal";
import { SuccessModal } from "./SuccessModal";

export const NewModals = (): JSX.Element => {
  const { modalType } = useBottomModal();
  const isOpen = modalType !== "none";

  useEffect(() => {
    // Disable scrolling when modal is open
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      <SettingsBottomModal />
      <ChangePasswordModal />
      <PodsCollectionBottomModal />
      <SuccessModal />
      <AboutZupassModal />
      <ManageEmailModal />
      <DeleteAccountModal />
    </>
  );
};
