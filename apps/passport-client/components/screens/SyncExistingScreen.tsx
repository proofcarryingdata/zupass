import { decryptStorage } from "@pcd/passport-crypto";
import React, { useCallback, useContext, useState } from "react";
import { downloadEncryptedStorage } from "../../src/api/endToEndEncryptionApi";
import { DispatchContext } from "../../src/dispatch";
import { BigInput, Button, H2, Spacer, TextCenter } from "../core";

/**
 * Users can navigate to this page in order to download
 * their end-to-end encrypted storage, given that they have
 * already logged in before. Backups happen automatically
 * on first login.
 */
export function SyncExistingScreen() {
  const [state, dispatch] = useContext(DispatchContext);
  const [email, setEmail] = useState("");
  const [syncKey, setSyncKey] = useState("");

  const onSyncClick = useCallback(() => {
    const load = async () => {
      const storage = await downloadEncryptedStorage(email);
      console.log("downloaded encrypted storage");
      const decrypted = await decryptStorage(storage, syncKey);
      console.log("decrypted encrypted storage");

      console.log(decrypted);

      dispatch({
        type: "load-from-sync",
        storage: decrypted,
        encryptionKey: syncKey,
      });
    };

    load();
  }, [email, syncKey]);
  const onClose = useCallback(() => {
    window.location.href = "/#/";
  }, []);

  return (
    <>
      <Spacer h={64} />
      <TextCenter>
        <H2>Sync Existing Passport</H2>
        <Spacer h={32} />
        <BigInput
          type="text"
          placeholder="email address"
          value={email}
          onChange={useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
            setEmail(e.target.value);
          }, [])}
        ></BigInput>
        <Spacer h={8} />
        <BigInput
          type="text"
          placeholder="sync key"
          value={syncKey}
          onChange={useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
            setSyncKey(e.target.value);
          }, [])}
        ></BigInput>
        <Spacer h={16} />
        <Button style="primary" type="submit" onClick={onSyncClick}>
          Sync
        </Button>
        <Spacer h={8} />
        <Button style="danger" type="submit" onClick={onClose}>
          Back
        </Button>
      </TextCenter>
    </>
  );
}
