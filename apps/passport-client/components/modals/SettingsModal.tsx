import { useCallback, useState } from "react";
import { appConfig } from "../../src/appConfig";
import { useDispatch, useSyncKey } from "../../src/appHooks";
import { Button, CenterColumn, Spacer, TextCenter } from "../core";
import { LinkButton } from "../core/Button";
import { icons } from "../icons";

export function SettingsModal() {
  const [justCopied, setJustCopied] = useState(false);
  const dispatch = useDispatch();
  const syncKey = useSyncKey();

  const close = useCallback(() => {
    dispatch({ type: "set-modal", modal: "" });
  }, [dispatch]);

  const copySyncKey = useCallback(async () => {
    // Use the window clipboard API to copy the key
    await window.navigator.clipboard.writeText(syncKey);
    setJustCopied(true);
    setTimeout(() => setJustCopied(false), 2000);
  }, [syncKey]);

  const clearPassport = useCallback(() => {
    if (window.confirm("Are you sure you want to log out?")) {
      dispatch({ type: "reset-passport" });
    }
  }, [dispatch]);

  return (
    <>
      <Spacer h={32} />
      <TextCenter>
        <img
          draggable="false"
          src={icons.settingsPrimary}
          width={34}
          height={34}
        />
      </TextCenter>
      <Spacer h={32} />
      <CenterColumn w={280}>
        <LinkButton to="/scan">
          {appConfig.isZuzalu ? "Verify a Passport" : "Scan Ticket"}
        </LinkButton>
        <Spacer h={16} />
        {appConfig.isZuzalu && (
          <Button onClick={copySyncKey}>
            {justCopied ? "Copied" : "Copy Sync Key"}
          </Button>
        )}
        {!appConfig.isZuzalu && (
          <LinkButton to="/change-password" onClick={close}>
            Change Password
          </LinkButton>
        )}
        <Spacer h={16} />
        <LinkButton
          to="/subscriptions"
          onClick={() => dispatch({ type: "set-modal", modal: "" })}
        >
          Manage Subscriptions
        </LinkButton>
        <Spacer h={16} />
        <Button onClick={clearPassport} style="danger">
          Log Out
        </Button>
      </CenterColumn>
    </>
  );
}
