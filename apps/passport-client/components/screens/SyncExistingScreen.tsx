import {
  EncryptedPacket,
  getHash,
  passportDecrypt,
} from "@pcd/passport-crypto";
import React, { useCallback, useContext, useState } from "react";
import { downloadEncryptedStorage } from "../../src/api/endToEndEncryptionApi";
import { DispatchContext } from "../../src/dispatch";
import { BigInput, Button, H2, Spacer, TextCenter } from "../core";
import { AppContainer } from "../shared/AppContainer";

/**
 * Users can navigate to this page in order to download
 * their end-to-end encrypted storage, given that they have
 * already logged in before. Backups happen automatically
 * on first login.
 */
export function SyncExistingScreen() {
  const [_, dispatch] = useContext(DispatchContext);

  const [syncKey, setSyncKey] = useState("");

  const onSyncClick = useCallback(() => {
    const load = async () => {
      let storage: EncryptedPacket;
      try {
        console.log("downloading e2ee storage...");
        const blobHash = await getHash(syncKey);
        storage = await downloadEncryptedStorage(blobHash);
      } catch (e: unknown) {
        console.error(e);
        dispatch({
          type: "error",
          error: {
            title: "Sync failed",
            message:
              "Couldn't load end-to-end encrypted backup. " +
              "If this is your first time using zupass.org, please generate a new passport instead.",
          },
        });
        return;
      }
      console.log("downloaded encrypted storage");
      const decrypted = await passportDecrypt(storage, syncKey);
      console.log("decrypted encrypted storage");

      dispatch({
        type: "load-from-sync",
        storage: decrypted,
        encryptionKey: syncKey,
      });
    };

    load().catch((e) => {
      const { message, stack } = e;
      console.error(e);
      dispatch({
        type: "error",
        error: { title: "Sync failed", message, stack },
      });
    });
  }, [syncKey, dispatch]);

  const onClose = useCallback(() => {
    window.location.hash = "#/";
  }, []);

  return (
    <AppContainer bg="primary">
      <Spacer h={64} />
      <TextCenter>
        <H2>SYNC EXISTING PASSPORT</H2>
        <Spacer h={32} />
        <TextCenter>
          If you've already created your passport on another device, you can
          sync it here. You can find your sync key on your existing device by
          clicking on the settings icon.
        </TextCenter>
        <Spacer h={32} />
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
        <Spacer h={32} />
      </TextCenter>
    </AppContainer>
  );
}
