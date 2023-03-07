import Head from "next/head";
import Image from "next/image";
import { useCallback } from "react";
import styled from "styled-components";
import { Button } from "../components/Button";
import Spacer from "../components/Spacer";
import { SemaphoreManager } from "../src/SemaphoreManager";

export default function ZuzaluApp() {
  return (
    <Container>
      <Head>
        <meta name="viewport" content="width=device-width, user-scalable=no" />
      </Head>
      <Image src="/zuzalu.png" alt="Zuzalu logo" width={128} height={128} />
      <h1>Welcome to Zulalu</h1>
      <p>
        This experimental passport uses zero-knowledge proofs to show Zuzalu
        citizenship without revealing who you are.
      </p>
      <br />
      <Form onSubmit={useCallback(onLogin, [])}>
        <BigInput type="text" placeholder="vitalik@ethereum.org" />
        <Spacer h={8} />
        <Button style="primary" type="submit">
          Generate Passport
        </Button>
      </Form>
      <Spacer h={8} />
      <Button onClick={useCallback(onSyncExisting, [])}>Sync Existing</Button>
      <Button onClick={useCallback(onSemaphoreTest, [])}>Test Semaphore</Button>
    </Container>
  );
}

const Form = styled.form`
  width: 100%;
`;

const BigInput = styled.input`
  width: 100%;
  padding: 16px;
  font-size: 1rem;
  border-radius: 4px;
  border: 1px solid #000;
`;

function onLogin(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
}

function onSyncExisting(e: React.MouseEvent<HTMLButtonElement>) {
  e.preventDefault();
  window.alert("Under construction");
}

function onSemaphoreTest(e: React.MouseEvent<HTMLButtonElement>) {
  e.preventDefault();
  const manager = new SemaphoreManager();
  manager.test();
}

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  height: 100%;
  width: 320px;
  margin: 0 auto;
  position: relative;
`;
