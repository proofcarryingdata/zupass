import * as React from "react";
import { ChangeEvent, useCallback, useState } from "react";
import styled from "styled-components";
import { Dispatcher } from "../src/dispatch";
import { BigInput, Button, Center, H1, Spacer } from "./core";

export function LoginScreen({ dispatch }: { dispatch: Dispatcher }) {
  const [email, setEmail] = useState("");
  const onGenPass = useCallback(
    function () {
      dispatch({ type: "gen-passport", body: { email } });
    },
    [dispatch, email]
  );

  return (
    <div>
      <Spacer h={24} />
      <Center>
        <img src="/zuzalu.png" alt="Zuzalu logo" width={128} height={128} />
        <Spacer h={16} />
        <H1>Welcome to Zulalu</H1>
      </Center>
      <Spacer h={24} />
      <p>
        This experimental passport uses zero-knowledge proofs to show that
        you&apos;re part of Zuzulu without revealing who you are.
      </p>
      <br />
      <Form onSubmit={onGenPass}>
        <BigInput
          type="text"
          placeholder="vitalik@ethereum.org"
          value={email}
          onChange={useCallback(
            (e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value),
            [setEmail]
          )}
        />
        <Spacer h={8} />
        <Button style="primary" type="submit">
          Generate Passport
        </Button>
      </Form>
      <Spacer h={24} />
      <hr />
      <Spacer h={24} />
      <Button
        onClick={useCallback(
          () => dispatch({ type: "nav-scan-and-verify" }),
          [dispatch]
        )}
      >
        Scan and verify
      </Button>
    </div>
  );
}

const Form = styled.form`
  width: 100%;
`;
