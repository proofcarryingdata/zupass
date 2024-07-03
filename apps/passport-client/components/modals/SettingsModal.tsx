import { LinkButton, TextButton } from "@pcd/passport-ui";
import { useCallback, useState } from "react";
import { IoSettingsOutline } from "react-icons/io5";
import { useDispatch, useHasSetupPassword, useSelf } from "../../src/appHooks";
import { Button, CenterColumn, Spacer, TextCenter } from "../core";
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

  const closeModal = useCallback(() => {
    dispatch({ type: "set-modal", modal: { modalType: "none" } });
  }, [dispatch]);

  const logout = useCallback(() => {
    if (window.confirm("Are you sure you want to log out?")) {
      dispatch({ type: "reset-passport" });
    }
  }, [dispatch]);

  const deleteAccount = useCallback(() => {
    if (window.confirm("Are you sure you want to delete your account?")) {
      dispatch({ type: "delete-account" });
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

        {!isProveOrAddScreen && (
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

        <Button onClick={logout} style="danger">
          Log Out
        </Button>

        {!isProveOrAddScreen &&
          (showAdvanced ? (
            <>
              <Spacer h={12} />
              <TextButton onClick={() => setShowAdvanced(!showAdvanced)}>
                Hide Advanced
              </TextButton>
              <Spacer h={8} />
              <Button onClick={deleteAccount} style="danger">
                Delete Account
              </Button>
            </>
          ) : (
            <>
              <Spacer h={12} />
              <TextButton onClick={() => setShowAdvanced(!showAdvanced)}>
                Advanced
              </TextButton>
            </>
          ))}

        <Spacer h={48} />
      </CenterColumn>
    </>
  );
}
