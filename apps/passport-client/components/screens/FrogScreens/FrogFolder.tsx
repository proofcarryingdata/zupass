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
      <img
        draggable="false"
        src="/images/frogs/frogcrypto.svg"
        height={12}
        width={135}
        style={{ transform: "translate(-2.5px, 1px)" }}
      />
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
            speed: { min: 10, max: 20 },
            direction: "top",
            random: false,
            straight: false,
            outMode: "destroy",
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
  font-size: 15px;
  /* vertical-align: super; */
  animation: color-change 1s infinite;
  font-family: monospace;
  /* align-self: stretch; */

  @keyframes color-change {
    0% {
      color: #fc9575;
    }
    50% {
      color: #83b692;
    }
    100% {
      color: #fc9575;
    }
  }
`;
