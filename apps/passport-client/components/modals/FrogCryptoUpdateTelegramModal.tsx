import { requestFrogCryptoUpdateTelegramHandleSharing } from "@pcd/passport-interface";
import { BtnBase } from "@pcd/passport-ui";
import { toast } from "react-hot-toast";
import styled from "styled-components";
import { appConfig } from "../../src/appConfig";
import { useCredentialManager, useDispatch } from "../../src/appHooks";
import { H3 } from "../core";
import { ActionButton } from "../screens/FrogScreens/Button";

export function FrogCryptoUpdateTelegramModal({
  revealed,
  refreshAll
}: {
  revealed: boolean;
  refreshAll: () => Promise<void>;
}): JSX.Element {
  const credentialManager = useCredentialManager();
  const dispatch = useDispatch();

  return (
    <Container>
      <H3>
        {revealed
          ? "Your Telegram Username Sharing"
          : "Share Your Telegram Username?"}
      </H3>
      <>
        {revealed ? (
          <>
            <p>
              Your Telegram username is shared with FrogCrypto via ZuKat and is
              visible on the leaderboard.
            </p>
            <p>
              If you prefer more privacy, you can choose to hide your Telegram
              username at any time. When hidden, you'll be assigned a
              pseudo-anonymous name based on your Semaphore ID.
            </p>
          </>
        ) : (
          <>
            <p>
              You're currently using a pseudo-anonymous name based on your
              Semaphore ID.
            </p>
            <p>
              You can share your Telegram username with FrogCrypto via ZuKat.
              ZuKat will have access to your username only if you've joined a
              ZuKat-gated Telegram chat. You can revert to a pseudo-anonymous
              name anytime.
            </p>
          </>
        )}
      </>
      <ActionButton
        ButtonComponent={BtnBase}
        onClick={async (): Promise<void> => {
          try {
            await requestFrogCryptoUpdateTelegramHandleSharing(
              appConfig.zupassServer,
              {
                pcd: await credentialManager.requestCredentials({
                  signatureType: "sempahore-signature-pcd"
                }),
                reveal: !revealed
              }
            );

            // once user preference is updated, we need to refetch both user's
            // score and leaderboard to fetch TG username
            await refreshAll();
          } catch (e) {
            console.error(e);
            toast.error(
              "There was an error updating your Telegram username. Maybe try again?"
            );
            return;
          }

          dispatch({
            type: "set-modal",
            modal: {
              modalType: "none"
            }
          });
        }}
      >
        {revealed ? "Hide My Telegram Username" : "Share My Telegram Username"}
      </ActionButton>
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 32px;
  margin: 0 16px;
`;
