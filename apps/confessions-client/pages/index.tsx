import { useEffect, useState } from "react";
import styled from "styled-components";
import { listConfessions } from "../src/api";
import { PublishConfession } from "../components/PublishConfession";

export default function Page() {
  const [confessions, setConfessions] = useState<any>(null);

  const loadConfessions = () => {
    (async () => {
      // TODO: paging
      const conf = await listConfessions(1, 30);
      setConfessions(conf);
    })();
  }

  useEffect(loadConfessions, []);

  return (
    <>
      <h1>Confessions Board</h1>
      <Container>
        <PublishConfession onPublished={loadConfessions}/>
      </Container>
      <Container>
        <h2>Confessions</h2>
        {confessions != null && (
          <pre>{JSON.stringify(confessions, null, 2)}</pre>
        )}
      </Container>
    </>
  );
}

const Container = styled.div`
  font-family: system-ui, sans-serif;
  border: 1px solid black;
  border-radius: 8px;
  padding: 8px;
  margin-bottom: 8px;
`;
