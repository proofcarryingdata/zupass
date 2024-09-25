import { ChangePasswordModal } from "./ChangePasswordModal";
import { SettingsBottomModal } from "./SettingsBottomModal";
import { SuccessModal } from "./SuccessModal";

export const NewModals = (): JSX.Element => {
  return (
    <>
      <SettingsBottomModal />
      <ChangePasswordModal />
      <SuccessModal />
    </>
  );
};
