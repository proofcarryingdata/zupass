import { ChangeEvent, FormEvent, useCallback, useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { appConfig } from "../../src/appConfig";
import { useDispatch, useSelf } from "../../src/appHooks";
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
  const self = useSelf();
  const [email, setEmail] = useState("");

  const onGenPass = useCallback(
    function (e: FormEvent<HTMLFormElement>) {
      e.preventDefault();
      dispatch({
        type: "new-passport",
        email: email.toLocaleLowerCase("en-US")
      });
    },
    [dispatch, email]
  );

  // Redirect to home if already logged in
  if (self != null) {
    window.location.hash = "#/";
  }

  return (
    <AppContainer bg="primary">
      <BackgroundGlow
        y={224}
        from="var(--bg-lite-primary)"
        to="var(--bg-dark-primary)"
      >
        <Spacer h={64} />
        <LoginHeader />
        <Spacer h={16} />
        <CenterColumn w={280}>
          <form onSubmit={onGenPass}>
            <BigInput
              type="text"
              placeholder="email address"
              value={email}
              onChange={useCallback(
                (e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value),
                [setEmail]
              )}
            />
            <Spacer h={8} />
            <Button style="primary" type="submit">
              Generate Pass
            </Button>
          </form>
        </CenterColumn>
        <Spacer h={24} />
        <HR />
        <Spacer h={24} />
        <CenterColumn w={280}>
          <LinkButton to={"/sync-existing"}>Login with Sync Key</LinkButton>
          {appConfig.isZuzalu && (
            <>
              <Spacer h={8} />
              <LinkButton to={"/scan"}>Verify a Passport</LinkButton>
            </>
          )}
          {!appConfig.isZuzalu && (
            <>
              <Spacer h={24} />
              <TextCenter>
                <DeviceLoginLink to={"/device-login"}>
                  Device Login
                </DeviceLoginLink>
              </TextCenter>
            </>
          )}
        </CenterColumn>
        <Spacer h={24} />
      </BackgroundGlow>
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
