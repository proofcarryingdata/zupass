import { AboutZupassModal } from "./AboutZupassModal";
import { ChangePasswordModal } from "./ChangePasswordModal";
import { ManageEmailModal } from "./ManageEmailsModal";
import { SettingsBottomModal } from "./SettingsBottomModal";
import { SuccessModal } from "./SuccessModal";

export const NewModals = (): JSX.Element => {
  return (
    <>
      <SettingsBottomModal />
      <ChangePasswordModal />
      <SuccessModal />
      <AboutZupassModal />
      <ManageEmailModal />
    </>
  );
};
