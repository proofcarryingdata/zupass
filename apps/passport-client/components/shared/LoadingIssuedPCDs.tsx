import { useEffect, useState } from "react";
import styled from "styled-components";
import { useLoadedIssuedPCDs } from "../../src/appHooks";

export function LoadingIssuedPCDs(): JSX.Element | null {
  const loadedIssuedPCDs = useLoadedIssuedPCDs();
  const [showing, setShowing] = useState(!loadedIssuedPCDs);

  useEffect(() => {
    if (loadedIssuedPCDs && showing) {
      setTimeout(() => {
        // setShowing(false);
      }, 1000);
    }
  }, [loadedIssuedPCDs, showing]);

  if (!showing) {
    return null;
  }

  return (
    <Container className="w-full rounded bg-gray-500 py-2 px-4 text-white text-lg font-bold mt-[0.75rem]">
      <div>Loading Tickets</div>
    </Container>
  );
}

const Container = styled.div`
  user-select: none;
  box-sizing: border-box;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  animation: fade 500ms ease-in-out infinite;

  @keyframes fade {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.8;
    }
  }
`;
