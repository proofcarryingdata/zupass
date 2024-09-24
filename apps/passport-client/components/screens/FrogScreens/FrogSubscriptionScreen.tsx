import { FrogCryptoFolderName } from "@pcd/passport-interface";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useSwipeable } from "react-swipeable";
import styled from "styled-components";
import { TypewriterClass } from "typewriter-effect";
import {
  useIsSyncSettled,
  useLoginIfNoSelf,
  useSubscriptions
} from "../../../src/appHooks";
import { pendingRequestKeys } from "../../../src/sessionStorage";
import { useSyncE2EEStorage } from "../../../src/useSyncE2EEStorage";
import { RippleLoader } from "../../core/RippleLoader";
import { AppContainer } from "../../shared/AppContainer";
import { TypistText } from "./TypistText";

export const FROM_SUBSCRIPTION_PARAM_KEY = "fromFrogSubscription";

/**
 * A screen where the user can subscribe to new frog feeds via deeplink.
 */
export function FrogSubscriptionScreen(): JSX.Element {
  useSyncE2EEStorage();
  const syncSettled = useIsSyncSettled();

  // get current frog subscriptions
  const { value: subs } = useSubscriptions();
  const frogSubs = subs
    .getActiveSubscriptions()
    .filter((sub) => sub.providerUrl.includes("frogcrypto"));
  const hasFrogSubs = frogSubs.length > 0;

  const { feedCode } = useParams();

  useEffect(() => {
    if (!syncSettled) {
      return;
    }
    // if the user has no frog subscriptions,
    // redirect to the frog manager screen
    if (!hasFrogSubs) {
      window.location.replace(
        `/#/?folder=${FrogCryptoFolderName}&${FROM_SUBSCRIPTION_PARAM_KEY}=true`
      );
      return;
    }

    if (feedCode) {
      window.location.replace(
        `/#/?folder=${FrogCryptoFolderName}&feedId=${feedCode}`
      );
    }
  }, [feedCode, hasFrogSubs, syncSettled]);

  useLoginIfNoSelf(
    pendingRequestKeys.viewFrogCrypto,
    feedCode ? JSON.stringify(feedCode) : ""
  );

  if (!syncSettled) {
    return <RippleLoader />;
  }

  return (
    <AppContainer bg="primary">
      <Container>
        <TypistText
          onInit={(typewriter): TypewriterClass =>
            typewriter.typeString(
              "You have chosen the path less traveled. What do you desire? Speak, and they shall be yours"
            )
          }
        >
          <Form
            onSubmit={(e): void => {
              e.preventDefault();
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              window.location.href = `/#/frogscriptions/${(e.target as any)[
                "feedCode"
              ]?.value}`;
            }}
          >
            <input type="text" id="feedCode" name="feedCode" />
            <input type="submit" value="Continue" />
          </Form>
        </TypistText>
      </Container>
    </AppContainer>
  );
}

const Container = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  gap: 32px;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 16px;
`;

const CHEAT_CODE_ACTIVATION_SEQUENCE = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "a",
  "b",
  "Enter"
] as const;

/**
 * A ambient module that listens for cheatcode and redirect user to frogscription
 */
export function useCheatCodeActivation(): void {
  const redirect = useCallback(() => {
    window.location.replace(`/#/frogscriptions`);
  }, []);

  // keep track of progress through cheat code
  const [_, setProgress] = useState(0);

  const checkProgress = useCallback(
    (key: string, swipe?: boolean) => {
      setProgress((prev) => {
        // nb: this should not happen
        if (prev >= CHEAT_CODE_ACTIVATION_SEQUENCE.length) {
          return 0;
        }
        if (CHEAT_CODE_ACTIVATION_SEQUENCE[prev] === key) {
          // complete sequence where swipe gesture don't need A,B,Enter
          if (
            prev ===
            CHEAT_CODE_ACTIVATION_SEQUENCE.length - (swipe ? 4 : 1)
          ) {
            redirect();
            return 0;
          }
          return prev + 1;
        }
        return 0;
      });
    },
    [redirect]
  );
  const onSwipe = useCallback(
    (key: string) => () => checkProgress(key, true),
    [checkProgress]
  );

  const { ref } = useSwipeable({
    onSwipedUp: onSwipe("ArrowUp"),
    onSwipedDown: onSwipe("ArrowDown"),
    onSwipedLeft: onSwipe("ArrowLeft"),
    onSwipedRight: onSwipe("ArrowRight")
  });
  useEffect(() => {
    // @ts-expect-error https://github.com/FormidableLabs/react-swipeable/issues/180#issuecomment-649677983
    ref(document);
  }, [ref]);

  useEffect(() => {
    const listener = (e: KeyboardEvent): void => {
      checkProgress(e.key);
    };
    document.addEventListener("keydown", listener);

    return () => {
      document.removeEventListener("keydown", listener);
    };
  }, [checkProgress]);
}
