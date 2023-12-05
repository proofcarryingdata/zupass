import { useCallback, useEffect, useState } from "react";
import styled, { keyframes } from "styled-components";

const THE_END = new Date("2023-11-26T23:59:59.999Z");

// when the season ends in less than 2 day, show the full message
const MESSAGE_CUT_OFF = 60 * 60 * 24 * 2; // 2 days

/**
 * A countdown timer towards the end of this season.
 */
export function Countdown() {
  const [timeLeft, setTimeLeft] = useState(
    (THE_END.getTime() - Date.now()) / 1000
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const delta = (THE_END.getTime() - Date.now()) / 1000;
      if (delta < MESSAGE_CUT_OFF) {
        setTimeLeft(Math.floor(delta * 100) / 100);
        return;
      }
      setTimeLeft(Math.floor(delta));
    }, 10);
    return () => clearInterval(interval);
  }, []);

  if (timeLeft <= 0) {
    return <TheEnd />;
  }

  if (timeLeft <= MESSAGE_CUT_OFF) {
    return (
      <Text>
        <p>Balance must be restored.</p>
        <p>The biomes close in:</p>
        <p
          style={{
            // quadratic curve to make the font size grow faster as time runs out
            // y(t0) = 16, y(0) = 48, y'(t0) = 0
            fontSize: Math.floor(
              (32 / MESSAGE_CUT_OFF / MESSAGE_CUT_OFF) * timeLeft * timeLeft +
                (-64 / MESSAGE_CUT_OFF) * timeLeft +
                48
            )
          }}
        >
          {timeLeft.toFixed(2)}
        </p>
      </Text>
    );
  }

  return <Text>{timeLeft}</Text>;
}

const THE_END_ANIMATION_SHOWN_KEY = "frogcrypto-the-end-animation-shown";

function TheEnd() {
  const [visible, setVisible] = useState(false);
  const dismiss = useCallback(() => {
    setVisible(false);
    localStorage.setItem(THE_END_ANIMATION_SHOWN_KEY, "true");
  }, []);
  useEffect(() => {
    if (localStorage.getItem(THE_END_ANIMATION_SHOWN_KEY) === "true") {
      return;
    }

    setVisible(true);
    setTimeout(dismiss, 10 * 1000);
  }, [dismiss]);

  return (
    <Container visible={visible} onClick={visible ? dismiss : undefined}>
      <img src="/images/frogs/frogelion.jpg" draggable={false} />
      <GameOver>IT IS DONE.</GameOver>
    </Container>
  );
}

const Text = styled.div`
  background-color: #d34d4d;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: stretch;
  gap: 0.5rem;
  padding: 0.5rem;
`;

const Container = styled.div<{ visible: boolean }>`
  position: fixed;
  z-index: 2000;
  width: 100vw;
  height: 100vh;
  top: 0;
  left: 0;
  background-color: black;
  pointer-events: ${({ visible }) => (visible ? "auto" : "none")};
  opacity: ${({ visible }) => (visible ? 1 : 0)};
  transition: opacity 2s ease-in-out;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 32px;

  & > img {
    width: min(100vw, 400px);
    opacity: 0.8;
  }
`;

const GameOverBlink = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const GameOver = styled.div`
  animation: ${GameOverBlink} 1s ease-in-out infinite alternate;
`;
