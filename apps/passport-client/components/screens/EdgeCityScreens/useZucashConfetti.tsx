import { useCallback, useEffect, useState } from "react";
import {
  Container,
  IMove,
  IOpacity,
  IRangedCoordinates,
  IShape,
  RecursivePartial,
  tsParticles
} from "tsparticles-engine";
import type { EmitterContainer } from "tsparticles-plugin-emitters";

const fpsLimit = 120;

export function useZucashConfetti(element?: HTMLElement): () => Promise<void> {
  const [container, setContainer] = useState<Container | null>(null);
  // destroy confetti when component unmounts. this stops the confetti but if we
  // don't do this, confetii plays again when we switch back to GetFrog
  useEffect(() => {
    if (!container) {
      return;
    }
    return () => {
      container.destroy();
    };
  }, [container]);

  const confetti = useCallback(async () => {
    const opacitySpeed = (100 * 1000) / (3600 * fpsLimit);
    const startCount = 50;
    const shape: RecursivePartial<IShape> = {
      type: ["text"],
      options: {
        text: {
          value: [
            "$",
            "$",
            "$",
            "$",
            "$",
            "$",
            "$ZUCASH",
            "💰",
            "💸",
            "💶",
            "💷",
            "💴",
            "🤑"
          ]
        }
      }
    };

    const position: IRangedCoordinates = {
      x: 50,
      y: 50
    };

    if (element) {
      const rect = element.getBoundingClientRect();
      position.x = ((rect.x + rect.width / 2) / window.innerWidth) * 100;
      position.y = ((rect.y + rect.height / 2) / window.innerHeight) * 100;
    }

    const move: RecursivePartial<IMove> = {
      angle: {
        value: 360,
        offset: 0
      },
      enable: true,
      gravity: {
        enable: true,
        acceleration: 9.81
      },
      speed: {
        min: 20,
        max: 40
      },
      decay: 0.05,
      direction: "none",
      random: true,
      straight: false,
      outModes: {
        default: "destroy",
        top: "none"
      }
    };
    const opacity: RecursivePartial<IOpacity> = {
      value: { min: 0, max: 1 },
      animation: {
        enable: true,
        sync: true,
        speed: opacitySpeed,
        startValue: "max",
        destroy: "min"
      }
    };

    if (container && !container.destroyed) {
      const alias = container as EmitterContainer;

      if (alias.addEmitter) {
        alias.addEmitter({
          startCount,
          position,
          size: {
            width: 0,
            height: 0
          },
          rate: {
            delay: 0,
            quantity: 0
          },
          life: {
            duration: 0.1,
            count: 1
          },
          particles: {
            shape,
            life: {
              count: 1
            },
            opacity,
            size: {
              value: 10
            },
            move
          }
        });

        return;
      }
    }

    tsParticles
      .load({
        fullScreen: {
          enable: true,
          zIndex: 100
        },
        fpsLimit,
        particles: {
          number: {
            value: 0
          },
          shape,
          opacity,
          size: {
            value: 10
          },
          links: {
            enable: false
          },
          life: {
            count: 1
          },
          move,
          rotate: {
            value: {
              min: 0,
              max: 360
            },
            direction: "random",
            animation: {
              enable: true,
              speed: 60
            }
          },
          tilt: {
            direction: "random",
            enable: true,
            value: {
              min: 0,
              max: 360
            },
            animation: {
              enable: true,
              speed: 60
            }
          },
          roll: {
            darken: {
              enable: true,
              value: 25
            },
            enable: true,
            speed: {
              min: 15,
              max: 25
            }
          },
          wobble: {
            distance: 30,
            enable: true,
            speed: {
              min: -15,
              max: 15
            }
          }
        },
        detectRetina: true,
        emitters: {
          name: "confetti",
          startCount,
          position,
          size: {
            width: 0,
            height: 0
          },
          rate: {
            delay: 0,
            quantity: 0
          },
          life: {
            duration: 0.1,
            count: 1
          }
        }
      })
      .then(setContainer);
  }, [container, element]);

  return confetti;
}
