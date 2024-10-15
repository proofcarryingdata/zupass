import { CardWithCopy, HiddenText, styled } from "@pcd/passport-ui";
import { PCDUI } from "@pcd/pcd-types";
import { SemaphoreIdentityPCD } from "@pcd/semaphore-identity-pcd";

export const SemaphoreIdentityPCDUI: PCDUI<SemaphoreIdentityPCD> = {
  renderCardBody: SemaphoreIdentityCardBody
};

function SemaphoreIdentityCardBody({
  pcd
}: {
  pcd: SemaphoreIdentityPCD;
}): JSX.Element {
  return (
    <Container>
      <p style={{ color: "var(--text-primary, #1E2C50)", marginBottom: 10 }}>
        This PCD represents a Sempahore Identity, which can be used to send
        anonymous group signals, log into websites, etc.
      </p>
      <CardWithCopy
        title="Semaphore Commitment"
        onCopy={() => {
          return navigator.clipboard.writeText(
            pcd.claim.identityV3.commitment.toString()
          );
        }}
      >
        <HiddenText text={pcd.claim.identityV3.commitment.toString()} />
      </CardWithCopy>
    </Container>
  );
}

const Container = styled.div`
  padding: 16px;
  overflow: hidden;
  width: 100%;
`;
