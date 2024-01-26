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
import { InlineError } from "../../shared/InlineError";

/**
 * Users can navigate to this page in order to download
 * their end-to-end encrypted storage, given that they have
 * already logged in before. Backups happen automatically
 * on first login.
 */
export function SyncExistingScreen(): JSX.Element {
  const dispatch = useDispatch();
  const [encryptionKey, setEncryptionKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const self = useSelf();

  useEffect(() => {
    if (self) {
      window.location.href = "#/";
    }
  }, [self]);

  const onSyncClick = useCallback(() => {
    if (encryptionKey === "") {
      setError("Enter your Sync Key");
      return;
    }

    const load = async (): Promise<void> => {
      setIsLoading(true);
      const storageResult = await requestDownloadAndDecryptStorage(
        appConfig.zupassServer,
        encryptionKey
      );
      setIsLoading(false);

      if (!storageResult.success) {
        if ("NotFound" === storageResult.error.name) {
          return setError(
            "Couldn't login with this Sync Key. If you've lost access to your" +
              " Sync Key you can reset your account from the homepage of this" +
              " website."
          );
        } else {
          return setError(
            "An error occurred while downloading encrypted storage."
          );
        }
      }

      dispatch({
        type: "load-after-login",
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
          If you've already registered and you've saved your Sync Key, you can
          sync with your other device here using your Sync Key. If you haven't
          saved your Sync Key, you may add a password by clicking on the
          settings icon on another logged-in device, and then refreshing here to
          log in with your password. If you've lost access to your account, you
          can reset your account from the homepage of this website.
        </TextCenter>
        <Spacer h={32} />
        <CenterColumn>
          <BigInput
            autoCapitalize="false"
            autoCorrect="false"
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
              <InlineError error={error} />
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
