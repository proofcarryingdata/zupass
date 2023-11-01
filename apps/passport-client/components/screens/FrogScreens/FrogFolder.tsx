import { FrogCryptoFolderName } from "@pcd/passport-interface/src/FrogCrypto";
import prettyMilliseconds from "pretty-ms";
import { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { loadFull } from "tsparticles";
import { tsParticles } from "tsparticles-engine";

const FOLDERS = ["", "/"];

export function FrogFolder({
  Container,
  folder
}: {
  folder: string;
  Container: React.ComponentType<any>;
}) {
  const showFrogFolder = useMemo(() => FOLDERS.includes(folder), [folder]);
  const divRef = useRef<HTMLDivElement>(null);
  useParticles(showFrogFolder ? divRef : null);

  if (!showFrogFolder) {
    return null;
  }

  return (
    <Container ref={divRef}>
      <img
        draggable="false"
        src="/images/frogs/pixel_frog.png"
        width={18}
        height={18}
      />
      <FunkyFont>
        {FrogCryptoFolderName.split("").map((letter, i) => (
          <BounceText key={i} delay={i * 0.1}>
            {letter}
          </BounceText>
        ))}
      </FunkyFont>
      <NewFont>
        <CountDown />
      </NewFont>
    </Container>
  );
}

function CountDown() {
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
  }, [end]);

  return <>{diffText}</>;
}

function useParticles(ref: React.RefObject<HTMLDivElement> | null) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const load = async () => {
      await loadFull(tsParticles);
      setReady(true);
    };
    load();
  }, []);

  useEffect(() => {
    if (!ready || !ref) {
      return;
    }

    tsParticles.load({
      element: ref.current,
      options: {
        fullScreen: {
          enable: true,
          zIndex: 100
        },
        fpsLimit: 120,
        particles: {
          number: {
            value: 0
          },
          color: {
            value: [
              "#004b23",
              "#006400",
              "#007200",
              "#008000",
              "#38b000",
              "#70e000",
              "#9ef01a",
              "#ccff33"
            ],
            animation: {
              enable: true,
              speed: 100,
              sync: true
            }
          },
          shape: {
            type: "image",
            image: {
              replaceColor: true,
              src: "/images/frogs/frog.svg"
            }
          },
          opacity: {
            value: 1
          },
          size: {
            value: { min: 1000, max: 2000 },
            animation: {
              enable: true,
              speed: 10,
              minimumValue: 1,
              sync: true,
              startValue: "min",
              count: 1
            }
          },
          move: {
            enable: true,
            speed: { min: 5, max: 20 },
            direction: "top",
            random: true,
            straight: false,
            outMode: "bounce-horizontal",
            gravity: {
              enable: true
            }
          }
        },
        interactivity: {
          detectsOn: "parent",
          events: {
            onClick: {
              enable: true,
              mode: "trail"
            },
            resize: true
          },
          modes: {
            trail: {
              delay: 0.1,
              quantity: 10
            }
          }
        },
        detectRetina: true
      }
    });
  }, [ready, ref]);
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

const FunkyFont = styled.div`
  font-family: "SuperFunky";
  font-size: 20px;
  display: flex;

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
