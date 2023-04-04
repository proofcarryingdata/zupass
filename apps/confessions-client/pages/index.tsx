import { useEffect, useState } from "react";
import styled from "styled-components";
import { Confessions } from "../components/Confessions";
import { Login } from "../components/Login";
import { PublishConfession } from "../components/PublishConfession";

export default function Page() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [newConfession, setNewConfession] = useState<string | undefined>();

  useEffect(() => {
    if (accessToken) return;

    const token = window.localStorage.getItem("access_token");
    setAccessToken(token);
  }, [accessToken]);

  const handleAccessToken = (token: string | null) => {
    setAccessToken(token)
    if (!token) {
      window.localStorage.removeItem("access_token");
    } else {
      window.localStorage.setItem("access_token", token!);
    }
  }

  return (
    <>
      <h1>Confessions Board</h1>
      {accessToken?
        <>
          <button
            onClick={
              () => handleAccessToken(null)
            }
          >
            Logout
          </button>
          <br/>
          <br/>
          <Container>
            <PublishConfession onPublished={setNewConfession}/>
          </Container>
        </>
        :
        <Login onLoggedIn={handleAccessToken}/>
      }
      <Container>
        <Confessions accessToken={accessToken} newConfession={newConfession} />
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
