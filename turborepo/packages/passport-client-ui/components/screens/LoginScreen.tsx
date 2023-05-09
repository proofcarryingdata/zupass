import * as React from "react";
import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useContext,
  useState,
} from "react";
import styled from "styled-components";
import { DispatchContext } from "../../src/dispatch";
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
  ZuLogo,
} from "../core";
import { LinkButton } from "../core/Button";
import { AppContainer } from "../shared/AppContainer";

export function LoginScreen() {
  const [state, dispatch] = useContext(DispatchContext);
  const [email, setEmail] = useState("");

  const onGenPass = useCallback(
    function (e: FormEvent<HTMLFormElement>) {
      e.preventDefault();
      dispatch({
        type: "new-passport",
        email: email.toLocaleLowerCase("en-US"),
      });
    },
    [dispatch, email]
  );

  // Redirect to home if already logged in
  if (state.self != null) {
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
        <TextCenter>
          <H1>PASSPORT</H1>
          <Spacer h={24} />
          <ZuLogo />
          <Spacer h={24} />
          <H2>ZUZALU</H2>
          <Spacer h={24} />
          <Description>
            This experimental passport uses zero-knowledge proofs to prove
            Zuzalu citizenship without revealing who you are.
          </Description>
        </TextCenter>
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
          <Spacer h={8} />
          <LinkButton to={"/scan"}>Verify a Passport</LinkButton>
        </CenterColumn>
        <Spacer h={24} />
      </BackgroundGlow>
    </AppContainer>
  );
}

const Description = styled.p`
  font-weight: 300;
  width: 220px;
  margin: 0 auto;
`;
