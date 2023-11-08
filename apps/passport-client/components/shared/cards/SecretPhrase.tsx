
import {
  QRDisplayWithRegenerateAndStorage,
  encodeQRPayload
} from "@pcd/passport-ui";
import { ArgumentTypeName } from "@pcd/pcd-types";
import {
  SecretPhrasePCD,
  SecretPhrasePCDPackage,
} from "@pcd/secret-phrase-pcd";
import { useCallback } from "react";
import styled from "styled-components";

function makeSecretPhraseVerifyLink(pcdStr: string): string {
  const link = `${window.location.origin
    }/#/check-phrase?id=${encodeURIComponent(pcdStr)}`;
  return link;
}

/**
 * Renders a QR code always in ZK
 * Expects the secret phrase pcd to contain a secret and creates a secret phrase pcd with the secret redacted
 */
function SecretPhraseQR({ pcd }: { pcd: SecretPhrasePCD }) {

  const generate = useCallback(async () => {
    console.log(`[QR] generating proof, timestamp ${Date.now()}`);
    if (!pcd.claim.secret)
      throw new Error("Could not generate a Secret Phrase proof - missing secret!")
    const zkPCD = await SecretPhrasePCDPackage.prove({
      includeSecret: {
        value: false,
        argumentType: ArgumentTypeName.Boolean
      },
      phraseId: {
        value: pcd.claim.phraseId.toString(),
        argumentType: ArgumentTypeName.Number,
      },
      username: {
        value: pcd.claim.username,
        argumentType: ArgumentTypeName.String,
      },
      secret: {
        value: pcd.claim.secret,
        argumentType: ArgumentTypeName.String,
      }
    });
    const serializedZKPCD = await SecretPhrasePCDPackage.serialize(zkPCD);
    const verificationLink = makeSecretPhraseVerifyLink(
      encodeQRPayload(JSON.stringify(serializedZKPCD))
    );
    return verificationLink;
  }, [pcd]);

  return (
    <QRDisplayWithRegenerateAndStorage
      key={pcd.id}
      generateQRPayload={generate}
      maxAgeMs={1000 * 60}
      uniqueId={pcd.id}
    // fqColor={getQRCodeColorOverride(pcd)}
    />
  );
}

export function SecretPhraseCardBody({ pcd }: { pcd: SecretPhrasePCD }) {
  return (
    <Container>
      <TicketInfo>
        <SecretPhraseQR pcd={pcd} />
        <SecretPhrasePCDPackage.renderCardBody pcd={pcd} />
      </TicketInfo>
    </Container>
  );
}

const Container = styled.span`
  padding: 16px;
  overflow: hidden;
  width: 100%;
`;

const TicketInfo = styled.div`
  margin-top: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
`;

const ZKMode = styled.div`
  display: flex;
  text-align: right;
  margin-top: 8px;
  padding: 0px 16px;
  width: 100%;
  justify-content: flex-end;
`;

const LoadingIconContainer = styled.div`
  height: 100%;
  width: 100%;
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const LoadingIcon = styled.img`
  height: 100px;
  width: 100px;
`;
