import { requestDownloadAndDecryptStorage } from "@pcd/passport-interface";
import { useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import { AppContainer } from "../../../components/shared/AppContainer";
import { appConfig } from "../../../src/appConfig";
import { useDispatch, useSelf } from "../../../src/appHooks";
import { Button2 } from "../../shared/Button";
import { Input2 } from "../../shared/Input";
import {
  LoginContainer,
  LoginTitleContainer
} from "../../shared/Login/LoginComponents";
import { Typography } from "../../shared/Typography";

/**
 * Users can navigate to this page in order to download
 * their end-to-end encrypted storage, given that they have
 * already logged in before. Backups happen automatically
 * on first login.
 */
export const NewSyncExistingScreen = (): JSX.Element => {
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
    <AppContainer bg="gray" fullscreen>
      <LoginContainer>
        <LoginTitleContainer>
          <Typography fontSize={24} fontWeight={800} color="#1E2C50">
            LOGIN
          </Typography>
          <Typography
            fontSize={16}
            fontWeight={400}
            color="#1E2C50"
            family="Rubik"
          >
            If you've already registered and you've saved your Sync Key, you can
            sync with your other device here using your Sync Key. <br />
            <br />
            If you haven't saved your Sync Key, you may add a password by
            clicking on the settings icon on another logged-in device, and then
            refreshing here to log in with your password. If you've lost access
            to your account, you can reset your account from the homepage of
            this website.
          </Typography>
        </LoginTitleContainer>
        <InputsContainer>
          <Input2
            autoCapitalize="off"
            autoCorrect="off"
            type="text"
            autoFocus
            placeholder="Sync key"
            value={encryptionKey}
            onChange={(e) => {
              setEncryptionKey(e.target.value);
              setError(undefined);
            }}
            error={error}
            disabled={isLoading}
          />
          <Button2 onClick={onSyncClick} disabled={isLoading}>
            {isLoading ? "Verifying..." : "Login"}
          </Button2>
          <Button2 onClick={onClose} variant="secondary">
            Cancel
          </Button2>
        </InputsContainer>
      </LoginContainer>
    </AppContainer>
  );
};

const InputsContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  gap: 8px;
  margin-bottom: 30px;
`;
