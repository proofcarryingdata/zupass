import { useCallback, useEffect, useRef, useState } from "react";
import { loadFull } from "tsparticles";
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

export function useFrogParticles(ref: React.RefObject<HTMLDivElement> | null) {
  const [ready, setReady] = useState(false);
  const [container, setContainer] = useState<Container | null>(null);
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

    tsParticles
      .load({
        element: ref.current,
        options: {
          fullScreen: {
            enable: true,
            zIndex: 100
          },
          fpsLimit,
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
      })
      .then(setContainer);
  }, [ready, ref]);

  return container;
}

export function useFrogConfetti() {
  const [container, setContainer] = useState<Container | null>(null);
  const mounted = useRef(true);
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
  // once the component unmounts, we don't want to animate the confetti
  useEffect(() => {
    return () => {
      mounted.current = false;
    };
  }, []);

  const [ready, setReady] = useState(false);
  useEffect(() => {
    const load = async () => {
      await loadFull(tsParticles);
      setReady(true);
    };
    load();
  }, []);

  const confetti = useCallback(async () => {
    const opacitySpeed = (100 * 1000) / (3600 * fpsLimit);
    const startCount = 50;
    const shape: RecursivePartial<IShape> = {
      type: ["text"],
      options: {
        text: {
          value: [
            "🐸",
            "🐸",
            "🐸",
            "🐸",
            "🐸",
            "🐸",
            "🎉",
            "✨",
            "🌟",
            "🍀",
            "💧",
            "🌈",
            "💚",
            "🎈",
            "🌳",
            "🌲",
            "🌾",
            "🌺",
            "🌻"
          ]
        }
      }
    };
    const position: IRangedCoordinates = {
      x: 50,
      y: 50
    };
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

    // don't animate confetti if component unmounted
    if (!mounted.current) {
      return;
    }

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
      .then((container) => {
        if (mounted.current) {
          setContainer(container);
        } else {
          // if component unmounted while confetti was loading, destroy it in 5
          // seconds for animation to play
          setTimeout(() => {
            container.destroy();
          }, 5000);
        }
      });
  }, [container]);

  return ready ? confetti : null;
}
