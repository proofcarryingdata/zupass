import * as React from "react";
import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useContext,
  useState,
} from "react";
import styled from "styled-components";
import { DispatchContext } from "../src/dispatch";
import { BigInput, Button, H1, Spacer, TextCenter } from "./core";

export function LoginScreen() {
  const [_, dispatch] = useContext(DispatchContext);
  const [email, setEmail] = useState("");

  const onGenPass = useCallback(
    function (e: FormEvent<HTMLFormElement>) {
      e.preventDefault();
      dispatch({ type: "new-passport", body: { email } });
    },
    [dispatch, email]
  );

  return (
    <div>
      <Spacer h={24} />
      <TextCenter>
        <img src="/zuzalu.png" alt="Zuzalu logo" width={128} height={128} />
        <Spacer h={16} />
        <H1>Welcome to Zuzalu</H1>
      </TextCenter>
      <Spacer h={24} />
      <p>
        This experimental passport uses zero-knowledge proofs to show that
        you&apos;re part of Zuzalu without revealing who you are.
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
