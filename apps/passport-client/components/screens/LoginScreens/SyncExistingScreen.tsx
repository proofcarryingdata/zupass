import { requestDownloadAndDecryptStorage } from "@pcd/passport-interface";
import { useCallback, useEffect, useState } from "react";
import { appConfig } from "../../../src/appConfig";
import { useDispatch, useSelf } from "../../../src/appHooks";
import {
  BigInput,
  Button,
  CenterColumn,
  H2,
  Spacer,
  TextCenter
} from "../../core";
import { RippleLoader } from "../../core/RippleLoader";
import { AppContainer } from "../../shared/AppContainer";

/**
 * Users can navigate to this page in order to download
 * their end-to-end encrypted storage, given that they have
 * already logged in before. Backups happen automatically
 * on first login.
 */
export function SyncExistingScreen() {
  const dispatch = useDispatch();
  const [encryptionKey, setEncryptionKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const self = useSelf();

  useEffect(() => {
    if (self) {
      window.location.href = "#/";
    }
  }, [self]);

  const onSyncClick = useCallback(() => {
    if (encryptionKey === "") {
      dispatch({
        type: "error",
        error: {
          title: "Missing Sync Key",
          message: "You must enter a sync key.",
          dismissToCurrentPage: true
        }
      });
      return;
    }
    const load = async () => {
      setIsLoading(true);
      const storageResult = await requestDownloadAndDecryptStorage(
        appConfig.zupassServer,
        encryptionKey
      );
      setIsLoading(false);

      if (!storageResult.success) {
        return dispatch({
          type: "error",
          error: {
            title: "Failed to Log In",
            message:
              "Couldn't login with this Sync Key. If you've lost access to your Sync Key" +
              " you can reset your account from the homepage of this website.",
            dismissToCurrentPage: true
          }
        });
      }

      dispatch({
        type: "load-from-sync",
        storage: storageResult.value,
        encryptionKey
      });
    };

    load();
  }, [encryptionKey, dispatch]);

  const onClose = useCallback(() => {
    window.location.hash = "#/";
  }, []);

  return (
    <AppContainer bg="primary">
      <Spacer h={64} />
      <TextCenter>
        <H2>LOGIN WITH SYNC KEY</H2>
        <Spacer h={32} />
        <TextCenter>
          If you've already registered, you can sync with your other device here
          using your Sync Key. You can find your Sync Key on your existing
          device by clicking on the settings icon.
        </TextCenter>
        <Spacer h={16} />
        <TextCenter>
          After you log in with your sync key, you'll be prompted to set a
          password. After that, you will only be able to log in with your
          password, and not your sync key.
        </TextCenter>
        <Spacer h={32} />
        <CenterColumn>
          <BigInput
            disabled={isLoading}
            type="text"
            placeholder="Sync Key"
            value={encryptionKey}
            onChange={useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
              setEncryptionKey(e.target.value);
            }, [])}
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
        </CenterColumn>
      </TextCenter>
      <Spacer h={64} />
    </AppContainer>
  );
}
