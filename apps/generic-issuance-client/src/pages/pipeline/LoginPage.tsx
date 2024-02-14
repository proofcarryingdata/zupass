import { Box, Button, HStack, Input, Spinner } from "@chakra-ui/react";
import { useStytch } from "@stytch/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { PageContent } from "../../components/Core";
import { LoadingContent } from "../../components/LoadingContent";
import { GlobalPageHeader } from "../../components/header/GlobalPageHeader";
import { PodboxLogo } from "../../components/header/PodboxButton";
import { SESSION_DURATION_MINUTES, ZUPASS_SERVER_URL } from "../../constants";
import { useJWT } from "../../helpers/userHooks";

function LoginPage(): JSX.Element {
  const stytchClient = useStytch();
  const jwt = useJWT();
  const [email, setEmail] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [hasSentEmail, setHasSentEmail] = useState(false);
  const [checkedToken, setCheckedToken] = useState(false);
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get("token");
  const navigate = useNavigate();

  // On receiving email code token, try to call Stytch API to authenticate.
  // Sets cookies (session and session JWT) if successful, which redirects
  // to dashboard.
  useEffect(() => {
    if (!token || checkedToken) return;
    stytchClient.magicLinks
      .authenticate(token, {
        session_duration_minutes: SESSION_DURATION_MINUTES
      })
      .then(() => {
        setCheckedToken(true);
      })
      .catch((e) => console.error(e));
  }, [stytchClient, token, checkedToken, navigate]);

  const handleLoginClick = async (): Promise<void> => {
    if (!email || hasSentEmail) return;

    try {
      setSendingEmail(true);
      await fetch(
        new URL(
          `/generic-issuance/api/user/send-email/${email}`,
          ZUPASS_SERVER_URL
        ),
        { method: "POST" }
      );
      setHasSentEmail(true);
    } catch (e) {
      alert(e);
    } finally {
      setSendingEmail(false);
    }
  };

  useEffect(() => {
    if (jwt) {
      window.location.href = "/#/dashboard";
    }
  }, [jwt]);

  if (jwt) {
    return (
      <>
        <GlobalPageHeader />
        <LoadingContent />
      </>
    );
  }

  if (token) {
    return (
      <>
        <GlobalPageHeader />
        <PageContent>Logging In...</PageContent>
      </>
    );
  }

  return (
    <>
      <PageContent>
        <Container>
          <Box marginBottom={6}>
            <PodboxLogo />
          </Box>
          <form
            onSubmit={(e): Promise<void> => {
              e.preventDefault();
              e.stopPropagation();
              return handleLoginClick();
            }}
          >
            {!hasSentEmail && (
              <HStack gap={2}>
                <Input
                  isDisabled={sendingEmail}
                  width={300}
                  style={{
                    marginLeft: "8px"
                  }}
                  autoFocus
                  value={email}
                  onChange={(e): void => setEmail(e.target.value)}
                  placeholder="email address"
                />

                <Button isDisabled={sendingEmail} type="submit">
                  Login
                </Button>
                {sendingEmail && <Spinner />}
              </HStack>
            )}

            {hasSentEmail && (
              <Box>
                Check your inbox for <b>{email}</b> to continue.
              </Box>
            )}
          </form>
        </Container>
      </PageContent>
    </>
  );
}

const Container = styled.div`
  display: flex;
  justify-content: center;
  flex-direction: column;
  align-items: center;
  min-height: 50vh;
`;

export default LoginPage;
