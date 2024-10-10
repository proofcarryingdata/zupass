import { HaLoNoncePCD } from "@pcd/halo-nonce-pcd";
import { FieldLabel, Spacer, TextContainer, styled } from "@pcd/passport-ui";
import { PCDUI } from "@pcd/pcd-types";

import { useEffect, useState } from "react";

export const HaLoNoncePCDUI: PCDUI<HaLoNoncePCD> = {
  renderCardBody: HaLoNonceCardBody,
  getHeader: Header
};

function useAirtableData(pubkeyHex: string): {
  headerText: string;
  imageUrl: string | undefined;
  loadedAirtable: boolean;
} {
  const [loadedAirtable, setLoadedAirtable] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [headerText, setHeaderText] = useState<string>("NFC STAMP");

  useEffect(() => {
    if (loadedAirtable) return;

    import("airtable").then(({ default: Airtable }) => {
      // Read-only API key into Airtable with no sensitive data
      const base = new Airtable({
        apiKey:
          "pat5y56owllLzfmW4.18658c109003682514513254c6f464f52022562acbb3af33d7fd95f05eebb6f2"
      }).base("appJcTn3eQUXKQEKT");

      base("Image link")
        .select({
          fields: ["pubKeyHex", "imageUrl", "experienceName"]
        })
        .eachPage(
          function page(records, fetchNextPage) {
            for (const record of records) {
              if (record.get("pubKeyHex") === pubkeyHex) {
                const recordImageUrl = record.get("imageUrl");
                if (recordImageUrl) {
                  setImageUrl(recordImageUrl.toString());
                }
                const experienceName = record.get("experienceName");
                if (experienceName) {
                  setHeaderText(experienceName.toString().toUpperCase());
                }
                break;
              }
            }
            fetchNextPage();
          },
          function done(err) {
            if (err) {
              console.error(err);
              return;
            }
            setLoadedAirtable(true);
          }
        );
    });
  }, [loadedAirtable, pubkeyHex]);

  return { headerText, imageUrl, loadedAirtable };
}

function Header({ pcd }: { pcd: HaLoNoncePCD }): JSX.Element {
  const { headerText } = useAirtableData(pcd.claim.pubkeyHex);
  return <>{headerText}</>;
}

function HaLoNonceCardBody({ pcd }: { pcd: HaLoNoncePCD }): JSX.Element {
  const { loadedAirtable, imageUrl } = useAirtableData(pcd.claim.pubkeyHex);

  if (!loadedAirtable) {
    return <Container />;
  } else if (imageUrl === undefined) {
    return (
      <Container>
        <FieldLabel>Unique nonce</FieldLabel>
        <TextContainer>
          {parseInt(pcd.proof.signedDigest.substring(0, 8), 16)}
        </TextContainer>
        <Spacer h={8} />

        <FieldLabel>Card public key</FieldLabel>
        <TextContainer>{pcd.claim.pubkeyHex}</TextContainer>
        <Spacer h={8} />
      </Container>
    );
  }

  return (
    <Container>
      <img draggable="false" src={imageUrl} />
      <Spacer h={8} />
      <center>
        <FieldLabel>
          Unique nonce: {parseInt(pcd.proof.signedDigest.substring(0, 8), 16)}
        </FieldLabel>
      </center>
    </Container>
  );
}

const Container = styled.div`
  padding: 16px;
  overflow: hidden;
  width: 100%;
`;
