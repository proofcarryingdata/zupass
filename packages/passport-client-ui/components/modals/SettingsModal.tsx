import React, { useCallback, useContext, useState } from "react";
import { DispatchContext } from "../../src/dispatch";
import { Button, CenterColumn, Spacer, TextCenter } from "../core";
import { LinkButton } from "../core/Button";
import { icons } from "../icons";

export function SettingsModal() {
  const [justCopied, setJustCopied] = useState(false);
  const [state, dispatch] = useContext(DispatchContext);

  const copySyncKey = useCallback(async () => {
    // Use the window clipboard API to copy the key
    await window.navigator.clipboard.writeText(state.encryptionKey);
    setJustCopied(true);
    setTimeout(() => setJustCopied(false), 2000);
  }, [state.encryptionKey]);

  const clearPassport = useCallback(() => {
    if (
      window.confirm(
        "Are you sure you want to clear your passport? This will delete your passport data."
      )
    ) {
      dispatch({ type: "reset-passport" });
    }
  }, [dispatch]);

  return (
    <>
      <Spacer h={32} />
      <TextCenter>
        <img src={icons.settingsPrimary} width={34} height={34} />
      </TextCenter>
      <Spacer h={32} />
      <CenterColumn w={280}>
        <LinkButton to="/scan">Verify a Passport</LinkButton>
        <Spacer h={16} />
        <Button onClick={copySyncKey}>
          {justCopied ? "Copied" : "Copy Key for Sync"}
        </Button>
        <Spacer h={16} />
        <Button onClick={clearPassport} style="danger">
          Clear Passport
        </Button>
      </CenterColumn>
    </>
  );
}
