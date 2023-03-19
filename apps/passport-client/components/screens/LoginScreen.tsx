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
  H1,
  H2,
  HR,
  Spacer,
  TextCenter,
  ZuLogo,
} from "../core";
import { LinkButton } from "../core/Button";

export function LoginScreen() {
  const [_, dispatch] = useContext(DispatchContext);
  const [email, setEmail] = useState("");

  const onGenPass = useCallback(
    function (e: FormEvent<HTMLFormElement>) {
      e.preventDefault();
      dispatch({ type: "new-passport", email });
    },
    [dispatch, email]
  );

  return (
    <BackgroundGlow>
      <Spacer h={64} />
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
      <Spacer h={16} />
      <Form onSubmit={onGenPass}>
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
      </Form>
      <Spacer h={24} />
      <HR />
      <Spacer h={24} />
      <Form>
        <LinkButton to={"/sync-existing"}>Sync Existing Passport</LinkButton>
        <Spacer h={8} />
        <LinkButton to={"/scan-and-verify"}>Verify a Passport</LinkButton>
      </Form>
    </BackgroundGlow>
  );
}

const Form = styled.form`
  width: 280px;
  margin: 0 auto;
`;

const Description = styled.p`
  font-weight: 300;
  width: 220px;
  margin: 0 auto;
`;
