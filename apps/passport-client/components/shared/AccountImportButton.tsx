import { useCallback } from "react";
import { useDispatch } from "../../src/appHooks";
import { Button } from "../core/Button";

export function AccountImportButton() {
  const dispatch = useDispatch();
  const showImportModal = useCallback(() => {
    dispatch({ type: "set-modal", modal: { modalType: "account-import" } });
  }, [dispatch]);

  return <Button onClick={showImportModal}>Import Account Data</Button>;
}
