import _ from "lodash";
import { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { loadFull } from "tsparticles";
import { tsParticles } from "tsparticles-engine";
import { usePCDCollection } from "../../../src/appHooks";

const FOLDER_PREFIXES = ["Devconnect"];

export function FrogFolder({
  Container
}: {
  Container: React.ComponentType<any>;
}) {
  const pcds = usePCDCollection();
  const showFrogFolder = useMemo(
    () =>
      !!FOLDER_PREFIXES.find((folder) =>
        _.values(pcds.folders).find((f) => f.startsWith(folder))
      ),
    [pcds]
  );
  const divRef = useRef<HTMLDivElement>(null);
  useParticles(divRef);

  if (!showFrogFolder) {
    return null;
  }

  return (
    <Container ref={divRef}>
      <FrogFont>FrogCrypto</FrogFont>
      <NewFont>SOON</NewFont>
    </Container>
  );
}

function useParticles(ref: React.RefObject<HTMLDivElement>) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const load = async () => {
      await loadFull(tsParticles);
      setReady(true);
    };
    load();
  }, []);

  useEffect(() => {
    if (!ready) {
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
              speed: 180,
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
            value: { min: 128, max: 256 },
            animation: {
              enable: true,
              speed: 5,
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
              quantity: 5
            }
          }
        },
        detectRetina: true
      }
    });
  }, [ready, ref]);
}

const FrogFont = styled.h2`
  font-size: 20px;
  color: var(--accent-dark);
`;

const NewFont = styled.div`
  font-size: 8px;
  vertical-align: super;
  animation: color-change 1s infinite;
  font-family: monospace;

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
