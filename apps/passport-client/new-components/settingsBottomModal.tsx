import { useBottomModal } from "../src/appHooks";
import { BottomModal } from "./BottomModal";

export function SettingsBottomModal(): JSX.Element {
  const activeBottomModal = useBottomModal();
  return (
    <BottomModal isOpen={activeBottomModal.modalType === "settings"}>
      <div>dsfsdfdsfdsfs</div>
      <div>dsfsdfdsfdsfs</div>
      <div>dsfsdfdsfdsfs</div>
      <div>dsfsdfdsfdsfs</div>
      <div>dsfsdfdsfdsfs</div>
      <div>dsfsdfdsfdsfs</div>
      <div>dsfsdfdsfdsfs</div>
      <div>dsfsdfdsfdsfs</div>
    </BottomModal>
  );
}
