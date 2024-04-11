import { ZupollError } from "../../../types";
import ErrorDialog from "./ErrorDialog";

export function ErrorOverlay({
  error,
  onClose,
  onLogout
}: {
  error: ZupollError;
  onClose: () => void;
  onLogout?: () => void;
}) {
  return (
    <>
      <ErrorDialog error={error} close={onClose}></ErrorDialog>
    </>
  );
}
