import Head from "next/head";
import Image from "next/image";
import { ChangeEvent, useCallback, useMemo, useState } from "react";
import styled from "styled-components";
import { Button } from "../components/Button";
import { CardElem } from "../components/CardElem";
import { Center, H1 } from "../components/core";
import { BigInput } from "../components/Input";
import { Spacer } from "../components/Spacer";
import { Card } from "../src/Card";

export default function ZuzaluApp() {
  // TODO: state store, dispatcher

  const [test, setTest] = useState(false);

  const dispatch = useCallback(
    function (action: Action) {
      switch (action.type) {
        case "gen-passport":
          setTest(true);
      }
    },
    [setTest]
  );

  return (
    <Container>
      <Head>
        <meta name="viewport" content="width=device-width, user-scalable=no" />
      </Head>
      {!test && <LoginScreen {...{ dispatch }} />}
      {test && <HomeScreen />}
    </Container>
  );
}

type Dispatcher = (action: Action) => void;

type Action =
  | {
      type: "gen-passport";
      body: {
        email: string;
      };
    }
  | {
      type: "nav-scan-and-verify";
    };

function LoginScreen({ dispatch }: { dispatch: Dispatcher }) {
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
        <Image src="/zuzalu.png" alt="Zuzalu logo" width={128} height={128} />
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

function HomeScreen() {
  const cards = useMemo(getTestCards, []);
  const [sel, setSel] = useState(cards[0]);

  return (
    <>
      <Spacer h={24} />
      <CardElem
        card={sel}
        expanded
        onClick={() => window.alert("Under construction")}
      />
      <Spacer h={24} />
      {cards.map((c, i) => {
        if (c === sel) return <CardElem key={i} />; // empty slot
        return <CardElem key={i} card={c} onClick={() => setSel(c)} />;
      })}
    </>
  );
}

function getTestCards(): Card[] {
  const c1 = {
    id: "0x1234",
    type: "zuzulu-id",
    display: {
      icon: "🧑‍🦱",
      header: "Zuzulu Resident",
      title: "Vitalik Buterin",
      description: "Zuzulu resident #42",
      color: "#bcb",
    },
    secret: "",
  };

  const c2 = {
    id: "0x1111",
    type: "zk-email",
    display: {
      icon: "✉️",
      header: "@mit.edu email",
      title: "@mit.edu",
      description: "Zero-knowledge proof, holder has an @mit.edu email address",
      color: "#e8bbbb",
    },
    secret: "",
  };

  const c3 = {
    id: "0x2222",
    type: "ed25519-keypair",
    display: {
      icon: "🔑",
      header: "key #1",
      title: "Ed25519 key #1",
      description: "Sample hackathon API keypair",
      color: "#dca",
    },
    secret: "",
  };

  return [c1, c2, c3];
}

const Form = styled.form`
  width: 100%;
`;

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
