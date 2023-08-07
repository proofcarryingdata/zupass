import React, { useCallback, useMemo, useState } from "react";
import styled from "styled-components";
import { Button } from "../core";

export function TestScreen() {
  const [counter, setCounter] = useState(0);

  const onClick = useCallback(() => {
    setCounter((c) => c + 1);
  }, []);

  const items = useMemo(() => ["one", "two", "three"], []);

  return (
    <Container>
      {counter}
      {items.map((i) => (
        <Item key={i} name={i} />
      ))}
      <Button onClick={onClick}>click me</Button>
    </Container>
  );
}

const Item = React.memo(({ name }: { name }) => {
  return <div>{name}</div>;
});

const Container = styled.div`
  background-color: black;
  color: white;
  width: 100vw;
  height: 100vh;
  padding: 64px;
`;
