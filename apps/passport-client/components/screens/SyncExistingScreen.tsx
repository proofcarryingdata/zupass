import {
  EncryptedPacket,
  getHash,
  passportDecrypt
} from "@pcd/passport-crypto";
import React, { useCallback, useState } from "react";
import { downloadEncryptedStorage } from "../../src/api/endToEndEncryptionApi";
import { useDispatch } from "../../src/appHooks";
import {
  BackgroundGlow,
  BigInput,
  Button,
  CenterColumn,
  H2,
  Spacer,
  TextCenter
} from "../core";
import { RippleLoader } from "../core/RippleLoader";
import { AppContainer } from "../shared/AppContainer";

/**
 * Users can navigate to this page in order to download
 * their end-to-end encrypted storage, given that they have
 * already logged in before. Backups happen automatically
 * on first login.
 */
export function SyncExistingScreen() {
  const dispatch = useDispatch();
  const [syncKey, setSyncKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const onSyncClick = useCallback(() => {
    if (syncKey === "") {
      dispatch({
        type: "error",
        error: {
          title: "Missing Password",
          message: "You must enter a Master Password.",
          dismissToCurrentPage: true
        }
      });
      return;
    }
    const load = async () => {
      let storage: EncryptedPacket;
      try {
        console.log("downloading e2ee storage...");
        setIsLoading(true);
        const blobHash = await getHash(syncKey);
        storage = await downloadEncryptedStorage(blobHash);
        if (!storage) {
          throw new Error("no e2ee for this Master Password found");
        }
      } catch (e: unknown) {
        console.error(e);
        dispatch({
          type: "error",
          error: {
            title: "Failed to Log In",
            message:
              "Couldn't login with this Master Password. If you've lost access to your Master Password" +
              " you can reset your account from the homepage of this website.",
            dismissToCurrentPage: true
          }
        });
        setIsLoading(false);
        return;
      }

      console.log("downloaded encrypted storage");
      const decrypted = await passportDecrypt(storage, syncKey);
      console.log("decrypted encrypted storage");

      dispatch({
        type: "load-from-sync",
        storage: JSON.parse(decrypted),
        encryptionKey: syncKey
      });

      setIsLoading(false);
    };

    load().catch((e) => {
      const { message, stack } = e;
      console.error(e);
      dispatch({
        type: "error",
        error: {
          title: "Failed to Log In",
          message,
          stack,
          dismissToCurrentPage: true
        }
      });
    });
  }, [syncKey, dispatch]);

  const onClose = useCallback(() => {
    window.location.hash = "#/";
  }, []);

  return (
    <AppContainer bg="primary">
      <BackgroundGlow
        y={224}
        from="var(--bg-lite-primary)"
        to="var(--bg-dark-primary)"
      >
        <Spacer h={64} />
        <TextCenter>
          <H2>LOGIN WITH MASTER PASSWORD</H2>
          <Spacer h={32} />
          <TextCenter>
            If you've already registered, you can sync with your other device
            here using your Master Password. You can find your Master Password
            on your existing device by clicking on the settings icon.
          </TextCenter>
          <Spacer h={32} />
          <CenterColumn w={280}>
            <BigInput
              disabled={isLoading}
              type="text"
              placeholder="Master Password"
              value={syncKey}
              onChange={useCallback(
                (e: React.ChangeEvent<HTMLInputElement>) => {
                  setSyncKey(e.target.value);
                },
                []
              )}
            ></BigInput>
            <Spacer h={8} />
            {!isLoading && (
              <>
                <Button style="primary" type="submit" onClick={onSyncClick}>
                  Login
                </Button>
                <Spacer h={8} />
                <Button type="submit" onClick={onClose}>
                  Cancel
                </Button>
              </>
            )}
            {isLoading && (
              <div>
                <RippleLoader />
              </div>
            )}
            <Spacer h={32} />
          </CenterColumn>
        </TextCenter>
      </BackgroundGlow>
    </AppContainer>
  );
}
