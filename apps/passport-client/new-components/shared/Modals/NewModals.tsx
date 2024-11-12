import React, { useEffect } from "react";
import { useBottomModal } from "../../../src/appHooks";
import { AboutZupassModal } from "./AboutZupassModal";
import { AnotherDeviceChangedPasswordBottomModal } from "./AnotherDeviceChangedPasswordBottomModal";
import { ChangePasswordModal } from "./ChangePasswordModal";
import { DeleteAccountModal } from "./DeleteAccountModal";
import { ImportModal } from "./ImportModal";
import { ManageEmailModal } from "./ManageEmailsModal";
import { PodsCollectionBottomModal } from "./PodsCollectionBottomModal";
import { SettingsBottomModal } from "./SettingsBottomModal";
import { SuccessModal } from "./SuccessModal";
import { SessionExpiredModal } from "./SessionExpiredModal";
import { ProveModal } from "./ProveModal";
import { HelpModal } from "./HelpModal";
import { TimerModal } from "./TimerModal";

export const NewModals = React.memo((): JSX.Element => {
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
      <AnotherDeviceChangedPasswordBottomModal />
      <PodsCollectionBottomModal />
      <SuccessModal />
      <AboutZupassModal />
      <ManageEmailModal />
      <DeleteAccountModal />
      <ImportModal />
      <SessionExpiredModal />
      <ProveModal />
      <HelpModal />
      <TimerModal />
    </>
  );
});
