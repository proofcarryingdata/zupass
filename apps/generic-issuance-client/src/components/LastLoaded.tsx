import { ReactNode, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { timeAgo } from "../helpers/util";

export function LastLoaded(): ReactNode {
  const [_now, setNow] = useState<Date>(new Date());
  const loaded = useMemo<Date>(() => {
    return new Date(Date.now());
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return (): void => clearInterval(interval);
  }, []);

  const agoStr = timeAgo.format(loaded, "twitter");

  return <Container>page loaded: {agoStr} ago</Container>;
}

const Container = styled.div`
  margin: 16px;
  opacity: 0.5;
  display: inline-block;
`;
