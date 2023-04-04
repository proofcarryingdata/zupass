import { useEffect, useState } from "react";
import styled from "styled-components";
import { listConfessions } from "../src/api";
import { Login } from "../components/Login";
import { PublishConfession } from "../components/PublishConfession";

export default function Page() {
  const [accessToken, setAccessToken] = useState<string | undefined>();
  const [confessions, setConfessions] = useState<any>(null);

  const loadConfessions = () => {
    if (accessToken === undefined) return;

    (async () => {
      // TODO: paging
      const conf = await listConfessions(1, 30);
      setConfessions(conf);
    })();
  }

  useEffect(loadConfessions, [accessToken]);

  return (
    <>
      <h1>Confessions Board</h1>
      {accessToken?
        <>
          <button
            onClick={
              () => setAccessToken(undefined)
            }
          >
            Logout
          </button>
          <br/>
          <br/>
          <Container>
            <PublishConfession onPublished={loadConfessions}/>
          </Container>
        </>
        :
        <Login onLoggedIn={setAccessToken}/>
      }
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
  margin-bottom: 16px;
`;
