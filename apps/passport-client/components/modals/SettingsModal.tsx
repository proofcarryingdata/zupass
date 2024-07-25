import { LinkButton, TextButton } from "@pcd/passport-ui";
import { useCallback, useState } from "react";
import { IoSettingsOutline } from "react-icons/io5";
import { useLocalStorage } from "usehooks-ts";
import { useDispatch, useHasSetupPassword, useSelf } from "../../src/appHooks";
import { BigInput, Button, CenterColumn, Spacer, TextCenter } from "../core";
import { AccountExportButton } from "../shared/AccountExportButton";

export function SettingsModal({
  isProveOrAddScreen
}: {
  isProveOrAddScreen: boolean;
}): JSX.Element {
  const dispatch = useDispatch();
  const self = useSelf();
  const hasSetupPassword = useHasSetupPassword();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState("");

  const closeModal = useCallback(() => {
    dispatch({ type: "set-modal", modal: { modalType: "none" } });
  }, [dispatch]);

  const logout = useCallback(() => {
    if (window.confirm("Are you sure you want to log out?")) {
      dispatch({ type: "reset-passport" });
    }
  }, [dispatch]);

  const [justDevcon, setJustDevcon] = useLocalStorage("justDevcon", false);
  const toggleJustDevcon = useCallback(() => {
    setJustDevcon((prev) => !prev);
  }, [setJustDevcon]);

  const deleteAccount = useCallback(() => {
    if (
      window.confirm(
        "Are you sure you want to delete your account? This action cannot be undone."
      ) &&
      window.confirm("Are you really sure?")
    ) {
      dispatch({ type: "delete-account" });
    } else {
      setDeleteMessage("");
    }
  }, [dispatch]);

  return (
    <>
      <TextCenter>
        <IoSettingsOutline color={"#468c80"} size={34} />
      </TextCenter>
      <Spacer h={16} />
      <CenterColumn>
        <TextCenter>{self?.email}</TextCenter>

        <Spacer h={16} />

        {!isProveOrAddScreen && !showAdvanced && (
          <>
            <LinkButton
              $primary={true}
              to="/scan"
              onClick={(): void => {
                dispatch({ type: "set-modal", modal: { modalType: "none" } });
              }}
            >
              Scan Ticket
            </LinkButton>
            <Spacer h={16} />
            <LinkButton
              $primary={true}
              to="/change-password"
              onClick={closeModal}
            >
              {hasSetupPassword ? "Change" : "Add"} Password
            </LinkButton>
            <Spacer h={16} />
            <AccountExportButton />
            <Spacer h={16} />
            <LinkButton $primary={true} to="/import" onClick={closeModal}>
              Import
            </LinkButton>
            <Spacer h={16} />
          </>
        )}

        {!showAdvanced && (
          <>
            <Button onClick={logout} style="danger">
              Log Out
            </Button>
            <Spacer h={16} />
            <Button onClick={toggleJustDevcon}>
              {justDevcon ? "Showing Just Devcon" : "Showing Everything"}
            </Button>
          </>
        )}

        {!isProveOrAddScreen &&
          (showAdvanced ? (
            <>
              <Button onClick={() => setShowAdvanced(!showAdvanced)}>
                Back
              </Button>
              <Spacer h={12} />
              <Button
                onClick={deleteAccount}
                style="danger"
                disabled={deleteMessage !== "delete me"}
              >
                Delete Account
              </Button>
              <Spacer h={12} />
              <BigInput
                placeholder="type 'delete me' to delete"
                value={deleteMessage}
                onChange={(e) => setDeleteMessage(e.target.value)}
              />
            </>
          ) : (
            <>
              <Spacer h={12} />
              <TextButton onClick={() => setShowAdvanced(!showAdvanced)}>
                Delete Account
              </TextButton>
            </>
          ))}

        <Spacer h={48} />
      </CenterColumn>
    </>
  );
}
