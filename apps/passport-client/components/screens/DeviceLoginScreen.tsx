import { Spacer } from "@pcd/passport-ui";
import { ChangeEvent, useCallback, useState } from "react";
import styled from "styled-components";
import { useDispatch } from "../../src/appHooks";
import { BigInput, Button, CenterColumn, H2, TextCenter } from "../core";
import { AppContainer } from "../shared/AppContainer";

export function DeviceLoginScreen() {
  const [email, setEmail] = useState("");
  const [secret, setSecret] = useState("");
  const dispatch = useDispatch();

  const onAuthenticate = useCallback(() => {
    dispatch({
      type: "new-device-login-passport"
    });
    dispatch({
      type: "device-login",
      secret: secret,
      email: email
    });
  }, [dispatch, email, secret]);

  return (
    <AppContainer bg="primary">
      <Container>
        <Spacer h={64} />
        <TextCenter>
          <H2>EVENT HOST LOGIN</H2>
          <Spacer h={32} />
          <TextCenter>
            Log in using the device-specific email and secret key
          </TextCenter>
        </TextCenter>
        <Spacer h={24} />
        <CenterColumn w={280}>
          <form>
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
            <BigInput
              type="text"
              placeholder="secret key"
              value={secret}
              onChange={useCallback(
                (e: ChangeEvent<HTMLInputElement>) => setSecret(e.target.value),
                [setSecret]
              )}
            />
            <Spacer h={8} />
            <Button style="primary" type="submit" onClick={onAuthenticate}>
              Authenticate
            </Button>
          </form>
        </CenterColumn>
      </Container>
    </AppContainer>
  );
}

const Container = styled.div`
  padding: 16px;
  width: 100%;
  max-width: 100%;
`;
