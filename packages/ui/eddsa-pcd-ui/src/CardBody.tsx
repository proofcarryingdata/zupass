import { EdDSAPCD } from "@pcd/eddsa-pcd";
import {
  FieldLabel,
  HiddenText,
  Separator,
  Spacer,
  styled
} from "@pcd/passport-ui";
import { PCDUI } from "@pcd/pcd-types";

export const EdDSAPCDUI: PCDUI<EdDSAPCD, unknown> = {
  renderCardBody: EdDSACardBody
};

/**
 * This component renders the body of a 'Card' that Zupass uses to display PCDs to the user.
 */
function EdDSACardBody({ pcd }: { pcd: EdDSAPCD }) {
  return (
    <Container>
      <p>This PCD represents an EdDSA signature of some bigint values</p>
      <Separator />
      <FieldLabel>Signed Message</FieldLabel>
      <HiddenText
        text={pcd.claim.message.map((num: bigint) => num.toString()).join(",")}
      />
      <Spacer h={8} />
      <FieldLabel>EdDSA Public Key</FieldLabel>
      <HiddenText text={pcd.claim.publicKey.join(",")} />
    </Container>
  );
}

const Container = styled.div`
  padding: 16px;
  overflow: hidden;
  width: 100%;
`;
