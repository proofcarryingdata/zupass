import {
  FieldLabel,
  HiddenText,
  QRDisplayWithRegenerateAndStorage,
  Separator,
  Spacer,
  TextContainer,
  encodeQRPayload
} from "@pcd/passport-ui";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { useCallback } from "react";
import styled from "styled-components";
import { SecretPhrasePCD, SecretPhrasePCDPackage } from "./SecretPhrasePCD";

/**
 * Make the URI for verifying a secret phrase pcd
 *
 * @param pcdStr - the serialized pcd
 * @param baseURI - the base uri to point verification to
 * @returns - the verification link
 */
export function makeSecretPhraseVerifyLink(
  baseURI: string,
  pcdStr: string
): string {
  return `${baseURI}/#/verify-phrase?pcd=${encodeURIComponent(pcdStr)}`;
}

/**
 * Component renders the secret phrase info for the PCD
 *
 * @param pcd - the SecretPhrasePCD to render
 * @returns - the component showing info about the known secret phrase
 */
export function SecretPhraseInfoDisplay({ pcd }: { pcd: SecretPhrasePCD }) {
  // render
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

      {(pcd.claim.secret ? true : false) && (
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

/**
 * Renders a QR code always in ZK
 * Expects the secret phrase pcd to contain a secret and creates a secret phrase pcd with the secret redacted
 *
 * @param pcd - the SecretPhrasePCD used to prove and generate a new PCD to encode in the QR
 * @param baseURI - the base uri to point the verification link to
 * @return - QR code component that points to verification link with serialized PCD
 */
function SecretPhraseQR({
  pcd,
  baseURI
}: {
  pcd: SecretPhrasePCD;
  baseURI: string;
}) {
  const generate = useCallback(async () => {
    console.log(`[QR] generating proof, timestamp ${Date.now()}`);
    // check that the claim includes the secret needed to construct the proof
    if (!pcd.claim.secret)
      throw new Error(
        "Could not generate a Secret Phrase proof - missing secret!"
      );

    const zkPCD = await SecretPhrasePCDPackage.prove({
      includeSecret: {
        value: false, // ensure set to false so proving outside of zupass does not reveal secret in PCD
        argumentType: ArgumentTypeName.Boolean
      },
      phraseId: {
        value: pcd.claim.phraseId.toString(),
        argumentType: ArgumentTypeName.Number
      },
      username: {
        value: pcd.claim.username,
        argumentType: ArgumentTypeName.String
      },
      secret: {
        value: pcd.claim.secret,
        argumentType: ArgumentTypeName.String
      }
    });

    // serialize pcd and encode in a QR
    const serializedZKPCD = await SecretPhrasePCDPackage.serialize(zkPCD);
    return makeSecretPhraseVerifyLink(
      baseURI,
      encodeQRPayload(JSON.stringify(serializedZKPCD))
    );
  }, [pcd, baseURI]);

  return (
    <QRDisplayWithRegenerateAndStorage
      key={pcd.id}
      generateQRPayload={generate}
      maxAgeMs={1000 * 60}
      uniqueId={pcd.id}
    />
  );
}

export function SecretPhraseCardBody({
  pcd,
  baseURI
}: {
  pcd: SecretPhrasePCD;
  baseURI: string;
}) {
  return (
    <Container>
      <PhraseInfo>
        <SecretPhraseQR pcd={pcd} baseURI={baseURI} />
        <SecretPhraseInfoDisplay pcd={pcd} />
      </PhraseInfo>
    </Container>
  );
}

const Container = styled.span`
  padding: 16px;
  overflow: hidden;
  width: 100%;
`;

const PhraseInfo = styled.div`
  margin-top: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
`;
