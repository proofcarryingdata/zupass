import { useCallback, useEffect, useState } from "react";
import { loadFull } from "tsparticles";
import { confetti } from "tsparticles-confetti";
import { Container, tsParticles } from "tsparticles-engine";

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
      })
      .then(setContainer);
  }, [ready, ref]);

  return container;
}

export function useFrogConfetti() {
  return useCallback(async () => {
    const container = await confetti({
      spread: 360,
      ticks: 100,
      gravity: 1,
      decay: 0.94,
      startVelocity: 20,
      particleCount: 50,
      scalar: 2,
      shapes: ["text"],
      shapeOptions: {
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
    });

    // fixme: workaround when we switch tab back to GetFrog, confetti plays
    // again. look into this later
    setTimeout(() => {
      container.destroy();
    }, 5000);
  }, []);
}
