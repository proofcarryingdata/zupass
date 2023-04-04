import { useEffect, useState } from "react";
import styled from "styled-components";
import { Confessions } from "../components/Confessions";
import { Login } from "../components/Login";
import { PublishConfession } from "../components/PublishConfession";

export default function Page() {
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    console.log("load accessToken");
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
        </>
        :
        <Login onLoggedIn={handleAccessToken}/>
      }
      <Container>
        <PublishConfession onPublished={() => {
            // loadConfessions(accessToken);
          }}
        />
      </Container>
      <Container>
        <Confessions accessToken={accessToken} />
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
