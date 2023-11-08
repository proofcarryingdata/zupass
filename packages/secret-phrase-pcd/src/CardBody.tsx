import { FieldLabel, HiddenText, Separator, Spacer, TextContainer } from "@pcd/passport-ui";
import styled from "styled-components";
import { SecretPhrasePCD } from "./SecretPhrasePCD";

/**
 * This component renders the body of a 'Card' that Zupass uses to display PCDs to the user.
 */
export function SecretPhraseCardBody({ pcd }: { pcd: SecretPhrasePCD }) {
  return (
    <Container>
      <p>This PCD represents knowledge of a secret phrase in "The Word"</p>

      <Separator />

      <FieldLabel>Round Number</FieldLabel>
      <TextContainer>{pcd.claim.phraseId.toString()}</TextContainer>
      <Spacer h={8} />

      <FieldLabel>Username</FieldLabel>
      <HiddenText
        text={pcd.claim.username}
      />
      <Spacer h={8} />

      <FieldLabel>Hash of the Secret Phrase</FieldLabel>
      <HiddenText text={pcd.claim.secretHash.toString()} />
    </Container>
  );
}

const Container = styled.div`
  padding: 16px;
  overflow: hidden;
  width: 100%;
`;