import { FieldLabel, Spacer, TextContainer } from "@pcd/passport-ui";
import Airtable from "airtable";
import { useEffect, useState } from "react";
import styled from "styled-components";
import { HaLoNoncePCD } from "./HaLoNoncePCD";

// Read-only API key into Airtable with no sensitive data
const base = new Airtable({
  apiKey:
    "pat5y56owllLzfmW4.18658c109003682514513254c6f464f52022562acbb3af33d7fd95f05eebb6f2",
}).base("appJcTn3eQUXKQEKT");

export function HaLoNonceCardBody({ pcd }: { pcd: HaLoNoncePCD }) {
  const [loadedAirtable, setLoadedAirtable] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (loadedAirtable) return;

    base("Image link")
      .select({
        fields: ["pubKeyHex", "imageUrl"],
      })
      .eachPage(
        function page(records, fetchNextPage) {
          for (const record of records) {
            if (record.get("pubKeyHex") === pcd.claim.pubkeyHex) {
              const recordImageUrl = record.get("imageUrl");
              if (recordImageUrl) {
                setImageUrl(recordImageUrl.toString());
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
  }, [pcd.claim.pubkeyHex, loadedAirtable]);

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
      <img src={imageUrl} />
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
