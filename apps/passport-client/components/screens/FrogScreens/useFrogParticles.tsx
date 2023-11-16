import { useCallback, useEffect, useState } from "react";
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
import { Emitter } from "tsparticles-plugin-emitters/types/Options/Classes/Emitter";

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
  }, [container]);

  return ready ? confetti : null;
}

export function useCelestialPondParticles(
  ref: React.RefObject<HTMLDivElement> | null
) {
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
          detectRetina: true,
          fullScreen: {
            enable: false,
            zIndex: 1
          },
          particles: {
            number: {
              value: 700,
              density: {
                enable: true
              }
            },
            color: {
              value: "#ffffff"
            },
            shape: {
              type: "circle"
            },
            opacity: {
              value: { min: 0.1, max: 0.5 },
              animation: {
                enable: true,
                speed: 3,
                sync: false
              }
            },
            size: {
              value: { min: 0.1, max: 5 },
              animation: {
                enable: true,
                speed: 20,
                sync: false
              }
            },
            links: {
              enable: true,
              distance: 150,
              color: "#ffffff",
              opacity: 0.4,
              width: 1
            },
            move: {
              enable: true,
              speed: 0.5,
              direction: "none",
              random: false,
              straight: false,
              outModes: "out"
            },
            twinkle: {
              particles: {
                enable: true,
                color: "#ffff6a",
                frequency: 0.005,
                opacity: 0.5
              },
              lines: {
                enable: true,
                color: "#0d47a1",
                frequency: 0.0005,
                opacity: 1
              }
            },
            interactivity: {
              events: {
                onHover: {
                  enable: true,
                  mode: "repulse"
                },
                resize: true
              },
              modes: {
                repulse: {
                  distance: 200
                }
              }
            }
          }
        }
      })
      .then(setContainer);
  }, [ready, ref]);

  return container;
}

export function useWrithingVoidParticles(
  ref: React.RefObject<HTMLDivElement> | null
) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const load = async () => {
      await loadFull(tsParticles);
      setReady(true);
    };
    load();
  }, []);

  const play = useCallback(async () => {
    if (!ready || !ref) {
      return;
    }

    const emitter = (
      move: RecursivePartial<IMove>
    ): RecursivePartial<Emitter> => ({
      particles: {
        shape: {
          type: "image",
          image: {
            replaceColor: true,
            src: "/images/frogs/frog.svg"
          }
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
            h: {
              enable: false,
              speed: 0
            },
            s: {
              enable: false,
              speed: 0
            },
            l: {
              enable: true,
              speed: 5,
              sync: false,
              offset: {
                min: 0,
                max: 80
              }
            }
          }
        },
        lineLinked: {
          enable: false
        },
        size: {
          value: 10,
          random: {
            enable: true,
            minimumValue: 5
          }
        },
        move: {
          enable: true,
          speed: {
            min: 5,
            max: 15
          },
          random: true,
          outMode: "none",
          straight: false,
          ...move
        }
      },
      life: {
        delay: 3,
        duration: 16,
        count: 1,
        wait: true
      },
      rate: {
        delay: 0.1,
        quantity: 1
      }
    });

    return tsParticles.load({
      detectRetina: true,
      fullScreen: {
        enable: true,
        zIndex: 2000
      },
      particles: {
        number: {
          value: 0
        }
      },
      absorbers: {
        size: {
          density: 15,
          value: Math.min(window.innerWidth, window.innerHeight) / 4 ?? 75,
          limit: {
            radius:
              (Math.min(window.innerWidth, window.innerHeight) * 0.8) / 2 ?? 100
          }
        },
        position: {
          x: 50,
          y: 50
        },
        opacity: 0,
        orbit: true
      },
      emitters: [
        {
          ...emitter({
            direction: "bottom",
            angle: {
              value: 30,
              offset: 0
            }
          }),
          position: {
            x: 0,
            y: 0
          }
        },
        {
          ...emitter({
            direction: "right",
            angle: {
              value: { min: 30, max: 90 },
              offset: 0
            }
          }),
          position: {
            x: 0,
            y: 100
          }
        },
        {
          ...emitter({
            direction: "left",
            angle: {
              value: 30,
              offset: 0
            }
          }),
          position: {
            x: 100,
            y: 0
          }
        },
        {
          ...emitter({
            direction: "top",
            angle: {
              value: 30,
              offset: 0
            }
          }),
          position: {
            x: 100,
            y: 100
          }
        }
      ]
    });
  }, [ready, ref]);

  return play;
}
