import { Box, Button, Input, Spinner, VStack } from "@chakra-ui/react";
import { useContext, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { PageContent } from "../../components/Core";
import { LoadingContent } from "../../components/LoadingContent";
import { GlobalPageHeader } from "../../components/header/GlobalPageHeader";
import { ZuboxLogo } from "../../components/header/ZuboxButton";
import { ZUPASS_SERVER_URL } from "../../constants";
import { GIContext } from "../../helpers/Context";
import { useJWT } from "../../helpers/userHooks";

function LoginPage(): JSX.Element {
  const jwt = useJWT();
  const context = useContext(GIContext);
  const [email, setEmail] = useState(
    process.env.STYTCH_PUBLIC_TOKEN ? "" : "admin@zubox.dev"
  );
  const [sendingEmail, setSendingEmail] = useState(false);
  const [hasSentEmail, setHasSentEmail] = useState(false);
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get("token") ?? undefined;
  const recievedAuthToken = useRef(false);

  // On receiving email code token, try to call Stytch API to authenticate.
  // Sets cookies (session and session JWT) if successful, which redirects
  // to dashboard.
  useEffect(() => {
    if (!recievedAuthToken.current && token) {
      recievedAuthToken.current = true;
      context
        .handleAuthToken(token)
        .then(() => {
          window.location.href = "/#/dashboard";
        })
        .catch((e) => {
          alert(e);
        });
    }
  }, [context, token]);

  const handleLoginClick = async (): Promise<void> => {
    if (!email || hasSentEmail) return;

    try {
      setSendingEmail(true);
      const res = await fetch(
        new URL(
          `/generic-issuance/api/user/send-email/${email}`,
          ZUPASS_SERVER_URL
        ),
        { method: "POST" }
      );

      // handles dev-mode email bypass case where
      // instead of sending a confirmation link code,
      // the server redirects to what the link in the
      // confirmation code would have taken the user to.
      if (res.status.toString().startsWith("3")) {
        window.location.href = await res.text();
      }

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
            <ZuboxLogo />
          </Box>
          <form
            onSubmit={(e): Promise<void> => {
              e.preventDefault();
              e.stopPropagation();
              return handleLoginClick();
            }}
          >
            {!hasSentEmail && (
              <VStack gap={2}>
                <Input
                  isDisabled={sendingEmail}
                  width={300}
                  autoFocus
                  value={email}
                  onChange={(e): void => setEmail(e.target.value)}
                  placeholder="email address"
                />

                <Button
                  isDisabled={sendingEmail}
                  type="submit"
                  w="100%"
                  variant="outline"
                >
                  Login
                </Button>
                {sendingEmail && <Spinner marginTop={4} />}
              </VStack>
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
