import { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { loadFull } from "tsparticles";
import { tsParticles } from "tsparticles-engine";

const FOLDERS = ["Devconnect"];

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
        width={24}
        height={24}
      />
      <img draggable="false" src="/images/frogs/frogcrypto.svg" height={24} />
      <NewFont>SOON</NewFont>
    </Container>
  );
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
            value: { min: 100, max: 200 },
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
              quantity: 3
            }
          }
        },
        detectRetina: true
      }
    });
  }, [ready, ref]);
}

const NewFont = styled.div`
  font-size: 12px;
  vertical-align: super;
  animation: color-change 1s infinite;
  font-family: monospace;
  align-self: stretch;

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
