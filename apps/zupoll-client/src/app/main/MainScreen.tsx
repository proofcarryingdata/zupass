import { LoadingPlaceholder } from "@/components/ui/LoadingPlaceholder";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styled from "styled-components";
import { Center, ContentContainer } from "../../@/components/ui/Elements";
import { ErrorOverlay } from "../../@/components/ui/ErrorOverlay";
import { AppHeader, MainActions } from "../../@/components/ui/Headers";
import { Ballot } from "../../api/prismaTypes";
import { BallotResponse } from "../../api/requestTypes";
import { LoginState, ZupollError } from "../../types";
import { listBallots } from "../../zupoll-server-api";
import { BallotListsForUser } from "./BallotListsForUser";
import { GuaranteesElement } from "./Guarantees";

export function MainScreen({
  loginState,
  logout
}: {
  loginState: LoginState;
  logout: () => void;
}) {
  const router = useRouter();
  const [loadingBallots, setLoadingBallots] = useState<boolean>(true);
  const [ballots, setBallots] = useState<Ballot[]>([]);
  const [error, setError] = useState<ZupollError>();

  useEffect(() => {
    async function getBallots() {
      const res = await listBallots(loginState.token);

      if (res === undefined) {
        const serverDownError: ZupollError = {
          title: "Retrieving polls failed",
          message: "Server is down. Contact passport@0xparc.org."
        };
        setError(serverDownError);
        return;
      }

      if (res.status === 403) {
        logout();
        return;
      }

      if (!res.ok) {
        const resErr = await res.text();
        console.error("error posting vote to the server: ", resErr);
        const err: ZupollError = {
          title: "Voting failed",
          message: `Server Error: ${resErr}`
        };
        setError(err);
        return;
      }

      const ballotResponse: BallotResponse = await res.json();
      setBallots(ballotResponse.ballots);
      console.log("loaded ballots:", ballotResponse.ballots);
      setLoadingBallots(false);
    }

    getBallots();
  }, [loginState.token, logout]);

  return (
    <Center>
      <AppHeader
        actions={
          <MainActions
            logout={logout}
            createBallot={() => router.push("/create-ballot")}
          />
        }
      />

      <ContentContainer>
        <GuaranteesElement />

        {loadingBallots ? (
          <LoadingPlaceholder />
        ) : (
          <BallotListsForUser
            logout={logout}
            loginState={loginState}
            ballots={ballots}
          />
        )}

        {error && (
          <ErrorOverlay
            error={error}
            onClose={() => {
              setError(undefined);
              router.push("/");
            }}
          />
        )}
      </ContentContainer>
    </Center>
  );
}

const H1 = styled.h1`
  color: black;
  margin-bottom: -0.5rem;
  font-size: 1.4rem;
  font-family: OpenSans;
  font-weight: 700;
  font-style: normal;
`;

const BallotListContainer = styled.div`
  display: flex;
  background: #eee;
  width: 100%;
  justify-content: center;
  flex-direction: column;
  margin-bottom: 2rem;
  border-radius: 1rem;
  padding: 1rem 2rem 1rem 2rem;
  border: 1px solid #eee;
`;

const TitleContainer = styled.div`
  display: flex;
  flex-direction: column;
  margin-bottom: 0.5rem;
`;
