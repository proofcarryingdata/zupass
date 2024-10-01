import { AboutZupassModal } from "./AboutZupassModal";
import { ChangePasswordModal } from "./ChangePasswordModal";
import { ManageEmailModal } from "./ManageEmailsModal";
import { PodsCollectionBottomModal } from "./PodsCollectionBottomModal";
import { SettingsBottomModal } from "./SettingsBottomModal";
import { SuccessModal } from "./SuccessModal";

export const NewModals = (): JSX.Element => {
  return (
    <>
      <SettingsBottomModal />
      <ChangePasswordModal />
      <PodsCollectionBottomModal />
      <SuccessModal />
      <AboutZupassModal />
      <ManageEmailModal />
    </>
  );
};
