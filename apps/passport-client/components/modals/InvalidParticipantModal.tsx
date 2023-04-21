import { Spacer } from "@pcd/passport-ui";
import styled from "styled-components";
import { Button, H1 } from "../core";

export function InvalidParticipantModal() {
  return (
    <Container>
      <Spacer h={24} />
      <H1>Invalid Passport</H1>
      <Spacer h={24} />
      <p>
        You've reset your passport on another device, invalidating this one.
        Click the button below to log out. Then you'll be able to sync your
        existing passport onto this device.
      </p>
      <Spacer h={24} />
      <Button>Exit</Button>
    </Container>
  );
}

const Container = styled.div`
  padding: 24px;
`;
