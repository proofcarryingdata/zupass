import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { useLoadedIssuedPCDs } from "../../src/appHooks";
import { Spinner } from "./Spinner";

export function LoadingIssuedPCDs(): JSX.Element | null {
  const loadedIssuedPCDs = useLoadedIssuedPCDs();
  const [alreadyLoaded] = useState(loadedIssuedPCDs);

  const [showLoading, setShowLoading] = useState(true);

  const hiddenStyle = useMemo(() => {
    return {
      opacity: 0,
      height: "0px",
      margin: "0px !important",
      marginBottom: "0px",
      fontSize: "0.1em !important",
      padding: "0px"
    };
  }, []);

  const [style, setStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (loadedIssuedPCDs) {
      setTimeout(() => {
        setShowLoading(false);
        setTimeout(() => {
          setStyle(hiddenStyle);
        }, 500);
      }, 1500);
    }
  }, [hiddenStyle, loadedIssuedPCDs]);

  if (alreadyLoaded) {
    return null;
  }

  return (
    <Container
      className="w-full text-white rounded-lg font-bold"
      style={{
        ...{
          padding: "8px",
          marginBottom: "0.75rem"
        },
        ...style
      }}
    >
      <Spinner
        text={!showLoading ? "Loaded Tickets" : "Loading Tickets"}
        show={showLoading}
      />
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
  height: 50px;
  background-color: rgba(0, 0, 0, 0.3);
  font-size: 1em;
  transition: all 200ms ease-in-out;
`;
