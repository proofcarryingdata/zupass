import {
  FrogCryptoFolderName,
  IFrogCryptoFeedSchema
} from "@pcd/passport-interface";
import prettyMilliseconds from "pretty-ms";
import { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { useSubscriptions } from "../../../src/appHooks";
import { DEFAULT_FROG_SUBSCRIPTION_PROVIDER_URL } from "./FrogHomeSection";
import { useFrogParticles } from "./useFrogParticles";

/**
 * Render the FrogCrypto folder in the home screen.
 *
 * The component currently checks if the game is on via any of the following:
 * 1. User already has active FrogCrypto subscriptions
 * 2. We can find any public and active FrogCrypto feeds
 * 3. The hard coded countdown date has passed
 *
 * Note: We will always flip the game on before the countdown date. The game on
 * logic is temporary and we will remove it once the game is live.
 */
export function FrogFolder({
  onFolderClick,
  Container
}: {
  onFolderClick: (folder: string) => void;
  Container: React.ComponentType<any>;
}) {
  const divRef = useRef<HTMLDivElement>(null);
  const { gameOn, setGameOn } = useFetchGameOn();
  useFrogParticles(gameOn === false ? divRef : null);

  return (
    <Container
      ref={divRef}
      onClick={gameOn ? () => onFolderClick(FrogCryptoFolderName) : undefined}
    >
      <img
        draggable="false"
        src="/images/frogs/pixel_frog.png"
        width={18}
        height={18}
      />
      <SuperFunkyFont>
        {FrogCryptoFolderName.split("").map((letter, i) => (
          <BounceText key={i} delay={i * 0.1}>
            {letter}
          </BounceText>
        ))}
      </SuperFunkyFont>
      {gameOn === false && (
        <NewFont>
          <CountDown setGameOn={setGameOn} />
        </NewFont>
      )}
    </Container>
  );
}

/**
 * Return whether the game has started.
 *
 * This is a temporary function and will be removed once the game is live.
 */
function useFetchGameOn(): {
  gameOn: boolean | null;
  setGameOn: (gameOn: boolean) => void;
} {
  const [gameOn, setGameOn] = useState<boolean | null>(null);
  const { value: subs } = useSubscriptions();

  useEffect(() => {
    const fetchGameOn = async () => {
      if (
        subs.getSubscriptionsForProvider(DEFAULT_FROG_SUBSCRIPTION_PROVIDER_URL)
          .length > 0
      ) {
        setGameOn(true);
      } else {
        const { feeds } = await subs.listFeeds(
          DEFAULT_FROG_SUBSCRIPTION_PROVIDER_URL
        );
        setGameOn(
          !!feeds.find((feed) => {
            const parsed = IFrogCryptoFeedSchema.safeParse(feed);
            return (
              parsed.success &&
              !parsed.data.private &&
              parsed.data.activeUntil > Date.now() / 1000
            );
          })
        );
      }
    };

    fetchGameOn();
  }, [subs]);

  return {
    gameOn,
    setGameOn
  };
}

/**
 * A countdown to a hard coded game start date.
 */
function CountDown({ setGameOn }: { setGameOn: (gameOn: boolean) => void }) {
  const end = useMemo(() => {
    return new Date("13 Nov 2023 23:00:00 PST");
  }, []);
  const [diffText, setDiffText] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const diffMs = end.getTime() - now.getTime();
      if (diffMs < 0) {
        setDiffText("");
        setGameOn(true);
      } else {
        const diffString = prettyMilliseconds(diffMs, {
          millisecondsDecimalDigits: 0,
          secondsDecimalDigits: 0,
          unitCount: 4
        });
        setDiffText(diffString);
      }
    }, 1000 / 30);

    return () => {
      clearInterval(interval);
    };
  }, [end, setGameOn]);

  return <>{diffText}</>;
}

const NewFont = styled.div`
  font-size: 14px;
  animation: color-change 1s infinite;
  font-family: monospace;
  margin-left: auto;

  @keyframes color-change {
    0% {
      color: #ff9900;
    }
    50% {
      color: #afffbc;
    }
    100% {
      color: #ff9900;
    }
  }
`;

export const SuperFunkyFont = styled.div`
  font-family: "SuperFunky";
  font-size: 20px;
  display: flex;
  user-select: none;

  * {
    background-size: 100%;
    background-color: #ff9900;
    background-image: linear-gradient(45deg, #ff9900, #afffbc);
    -webkit-background-clip: text;
    -moz-background-clip: text;
    -webkit-text-fill-color: transparent;
    -moz-text-fill-color: transparent;
  }
`;

const BounceText = styled.span<{ delay: number }>`
  animation: bounce 5s infinite ${(p) => p.delay}s;

  @keyframes bounce {
    0% {
      transform: scale(1, 1) translateY(0);
    }
    2% {
      transform: scale(1.1, 0.9) translateY(0);
    }
    5% {
      transform: scale(0.9, 1.1) translateY(-10px);
    }
    10% {
      transform: scale(1.05, 0.95) translateY(0);
    }
    12% {
      transform: scale(1, 1) translateY(-2px);
    }
    15% {
      transform: scale(1, 1) translateY(0);
    }
    100% {
      transform: scale(1, 1) translateY(0);
    }
  }

  @-webkit-keyframes bounce {
    0% {
      transform: scale(1, 1) translateY(0);
    }
    2% {
      transform: scale(1.1, 0.9) translateY(0);
    }
    5% {
      transform: scale(0.9, 1.1) translateY(-10px);
    }
    10% {
      transform: scale(1.05, 0.95) translateY(0);
    }
    12% {
      transform: scale(1, 1) translateY(-2px);
    }
    15% {
      transform: scale(1, 1) translateY(0);
    }
    100% {
      transform: scale(1, 1) translateY(0);
    }
  }
`;
