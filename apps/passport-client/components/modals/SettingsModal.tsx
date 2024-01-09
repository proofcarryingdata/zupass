import { icons } from "@pcd/passport-ui";
import { useCallback } from "react";
import { useDispatch, useHasSetupPassword, useSelf } from "../../src/appHooks";
import { Button, CenterColumn, Spacer, TextCenter } from "../core";
import { LinkButton } from "../core/Button";
import { AccountExportButton } from "../shared/AccountExportButton";

export function SettingsModal({
  isProveOrAddScreen
}: {
  isProveOrAddScreen: boolean;
}) {
  const dispatch = useDispatch();
  const self = useSelf();
  const hasSetupPassword = useHasSetupPassword();

  const close = useCallback(() => {
    dispatch({ type: "set-modal", modal: { modalType: "none" } });
  }, [dispatch]);

  const clearZupass = useCallback(() => {
    if (window.confirm("Are you sure you want to log out?")) {
      dispatch({ type: "reset-passport" });
    }
  }, [dispatch]);

  return (
    <>
      <TextCenter>
        <img
          draggable="false"
          src={icons.settingsPrimary}
          width={34}
          height={34}
        />
      </TextCenter>
      <Spacer h={16} />
      <CenterColumn>
        <TextCenter>{self.email}</TextCenter>
        <Spacer h={16} />
        {!isProveOrAddScreen && (
          <>
            <LinkButton $primary={true} to="/scan">
              Scan Ticket
            </LinkButton>
            <Spacer h={16} />
            <LinkButton $primary={true} to="/change-password" onClick={close}>
              {hasSetupPassword ? "Change" : "Add"} Password
            </LinkButton>
            <Spacer h={16} />
            <AccountExportButton />
            <Spacer h={16} />
            <LinkButton $primary={true} to="/import" onClick={close}>
              Import Account Data
            </LinkButton>
            <Spacer h={16} />
          </>
        )}

        <Button onClick={clearZupass} style="danger">
          Log Out
        </Button>
        <Spacer h={24} />
      </CenterColumn>
    </>
  );
}
