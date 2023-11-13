import { FieldLabel, HiddenText, Separator, Spacer, TextContainer } from "@pcd/passport-ui";
import styled from "styled-components";
import { SecretPhrasePCD } from "./SecretPhrasePCD";

/**
 * This component renders the body of a 'Card' that Zupass uses to display PCDs to the user.
 */
export function SecretPhraseCardBody({ pcd }: { pcd: SecretPhrasePCD }) {
  // determine whether or not to show the secret hash
  const isSecret = pcd.claim.secret ? false : true;
  return (
    <Container>
      <p>PCD proving knowledge of a secret phrase for "The Word"</p>
      <Separator />

      <FieldLabel>Round Number</FieldLabel>
      <TextContainer>{pcd.claim.phraseId.toString()}</TextContainer>
      <Spacer h={8} />

      <FieldLabel>Username</FieldLabel>
      <TextContainer>{pcd.claim.username}</TextContainer>
      <Spacer h={8} />

      {!isSecret && (
        <>
          <FieldLabel>Secret Phrase</FieldLabel>
          <HiddenText text={pcd.claim.secret || ""} />
        </>
      )}
      <Spacer h={8} />
      <FieldLabel>Hash of the Secret Phrase</FieldLabel>
      <TextContainer>{pcd.claim.secretHash.toString()}</TextContainer>
    </Container>
  );
}

const Container = styled.div`
  padding: 16px;
  overflow: hidden;
  width: 100%;
`;
