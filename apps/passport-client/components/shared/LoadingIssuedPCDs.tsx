import { useEffect, useState } from "react";
import styled from "styled-components";
import { useLoadedIssuedPCDs } from "../../src/appHooks";

const HIDE_DELAY_MS = 150;

export function LoadingIssuedPCDs(): JSX.Element | null {
  const loadedIssuedPCDs = useLoadedIssuedPCDs();
  const [showing, setShowing] = useState(!loadedIssuedPCDs);
  const [hiding, setHiding] = useState(false);

  useEffect(() => {
    if (loadedIssuedPCDs && showing) {
      setTimeout(() => {
        setTimeout(() => {
          setShowing(false);
        }, HIDE_DELAY_MS);
        setHiding(true);
      }, 1000);
    }
  }, [loadedIssuedPCDs, showing]);

  if (!showing) {
    return null;
  }

  return (
    <Container
      className="w-full rounded bg-gray-500 py-2 px-4 text-white text-lg font-bold mt-[0.75rem]"
      style={hiding ? { opacity: 0 } : { opacity: 1 }}
    >
      <div>Loading Tickets</div>
    </Container>
  );
}

const Container = styled.div`
  @keyframes fade {
    0%,
    100% {
      background-color: rgba(0, 0, 0, 1);
    }
    50% {
      background-color: rgba(0, 0, 0, 0.5);
    }
  }

  user-select: none;
  box-sizing: border-box;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  animation: fade 200ms ease-in-out infinite;
  transition: all ${HIDE_DELAY_MS}ms;
`;
