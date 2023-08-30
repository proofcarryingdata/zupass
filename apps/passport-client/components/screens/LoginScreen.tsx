import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useState
} from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { appConfig } from "../../src/appConfig";
import { useDispatch, useQuery, useSelf } from "../../src/appHooks";
import { validateEmail } from "../../src/util";
import {
  BackgroundGlow,
  BigInput,
  Button,
  CenterColumn,
  H1,
  H2,
  HR,
  Spacer,
  TextCenter,
  ZuLogo
} from "../core";
import { LinkButton } from "../core/Button";
import { AppContainer } from "../shared/AppContainer";

export function LoginScreen() {
  const dispatch = useDispatch();
  const query = useQuery();
  const redirectedFromAction = query?.get("redirectedFromAction") === "true";

  const self = useSelf();
  const [email, setEmail] = useState("");

  const onGenPass = useCallback(
    function (e: FormEvent<HTMLFormElement>) {
      e.preventDefault();

      if (email === "") {
        dispatch({
          type: "error",
          error: {
            title: "Enter an Email",
            message: "You must enter an email address to register.",
            dismissToCurrentPage: true
          }
        });
      } else if (validateEmail(email) === false) {
        dispatch({
          type: "error",
          error: {
            title: "Invalid Email",
            message: `'${email}' is not a valid email.`,
            dismissToCurrentPage: true
          }
        });
      } else {
        dispatch({
          type: "new-passport",
          email: email.toLocaleLowerCase("en-US")
        });
      }
    },
    [dispatch, email]
  );

  useEffect(() => {
    // Redirect to home if already logged in
    if (self != null) {
      window.location.hash = "#/";
    }
  }, [self]);

  return (
    <AppContainer bg="primary">
      <BackgroundGlow
        y={224}
        from="var(--bg-lite-primary)"
        to="var(--bg-dark-primary)"
      >
        <Spacer h={64} />
        {redirectedFromAction ? (
          <>
            <TextCenter>
              <H2>LOGIN</H2>
            </TextCenter>
            <Spacer h={32} />
            <TextCenter>
              To complete this request, you need to either log into your
              existing PCDpass account, or create a new one.
            </TextCenter>
          </>
        ) : (
          <>
            <LoginHeader />
          </>
        )}

        <Spacer h={24} />

        <CenterColumn w={280}>
          <form onSubmit={onGenPass}>
            <BigInput
              type="text"
              placeholder="your email address"
              value={email}
              onChange={useCallback(
                (e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value),
                [setEmail]
              )}
            />
            <Spacer h={8} />
            <Button style="primary" type="submit">
              Register
            </Button>
          </form>
        </CenterColumn>
        <Spacer h={24} />
        <HR />
        <Spacer h={24} />
        <CenterColumn w={280}>
          <LinkButton to={"/sync-existing"}>
            Login with Master Password
          </LinkButton>
          {appConfig.isZuzalu && (
            <>
              <Spacer h={8} />
              <LinkButton to={"/scan"}>Verify a Passport</LinkButton>
            </>
          )}
          {!appConfig.isZuzalu && !redirectedFromAction && (
            <>
              <Spacer h={8} />
              <TextCenter>
                <DeviceLoginLink to={"/device-login"}>
                  Event Host Login
                </DeviceLoginLink>
              </TextCenter>
            </>
          )}
        </CenterColumn>
      </BackgroundGlow>
      <Spacer h={64} />
    </AppContainer>
  );
}

function LoginHeader() {
  if (appConfig.isZuzalu) {
    return (
      <TextCenter>
        <H1>PASSPORT</H1>
        <Spacer h={24} />
        <ZuLogo />
        <Spacer h={24} />
        <H2>ZUZALU</H2>
        <Spacer h={24} />
        <Description>
          This experimental passport uses zero-knowledge proofs to prove Zuzalu
          citizenship without revealing who you are.
        </Description>
      </TextCenter>
    );
  }

  return (
    <TextCenter>
      <H1>PCDPASS</H1>
      <Spacer h={24} />
      <Description>
        This experimental passport uses zero-knowledge proofs to prove aspects
        of your identity to other websites.
      </Description>
    </TextCenter>
  );
}

const Description = styled.p`
  font-weight: 300;
  width: 220px;
  margin: 0 auto;
`;

const DeviceLoginLink = styled(Link)`
  color: #aaa;
  &:hover {
    text-decoration: underline;
  }
  &:visited {
    color: #aaa;
  }
`;
