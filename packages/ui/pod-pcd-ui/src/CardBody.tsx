import { ErrorContainer, SlidingTabs, styled, VIcon } from "@pcd/passport-ui";
import { PCDUI } from "@pcd/pcd-types";
import { getImageUrlEntry, PODPCD, PODPCDPackage } from "@pcd/pod-pcd";
import { getErrorMessage } from "@pcd/util";
import { useMemo, useState } from "react";
import { CollectablePODPCDCardBody } from "./renderers/CollectablePODPCDCardBody";
import { DefaultPODPCDCardBody } from "./renderers/DefaultPODPCDCardBody";
import { Container } from "./shared";

export const PODPCDUI: PCDUI<PODPCD> = {
  renderCardBody: PODPCDCardBody
};

const CardWrapper = styled.div`
  padding: 12px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: 0px 1px 2px 0px rgba(0, 0, 0, 0.05);
`;

enum PODDisplayFormat {
  POD = "pod",
  Collectable = "collectable"
}

/**
 * This component renders the body of a 'Card' that Zupass uses to display PCDs to the user.
 */
function PODPCDCardBody({ pcd }: { pcd: PODPCD }): JSX.Element {
  const [sigStatus, setSigStatus] = useState<number>(0);
  const [error, setError] = useState<string | undefined>();

  const hasCollectableContent = useMemo(() => {
    const imageUrlEntry = getImageUrlEntry(pcd);
    return imageUrlEntry?.type === "string" && imageUrlEntry.value !== "";
  }, [pcd]);

  const availableDisplayFormat = getPreferredDisplayFormat(pcd);
  const [displayFormat, setDisplayFormat] = useState<PODDisplayFormat>(
    hasCollectableContent
      ? availableDisplayFormat || PODDisplayFormat.Collectable
      : PODDisplayFormat.POD
  );

  let content: JSX.Element;
  if (displayFormat === PODDisplayFormat.Collectable && hasCollectableContent) {
    content = <CollectablePODPCDCardBody pcd={pcd} />;
  } else {
    content = <DefaultPODPCDCardBody pcd={pcd} />;
  }

  const sigButtonColor: React.CSSProperties = {};
  if (sigStatus > 0) {
    sigButtonColor.color = "white";
    sigButtonColor.background = "green";
  } else if (sigStatus < 0) {
    sigButtonColor.color = "white";
    sigButtonColor.background = "var(--danger)";
  }

  const isValidSig = sigStatus > 0;
  return (
    <Container>
      <CardWrapper>
        {content}
        <div style={{ paddingLeft: 12 }}>
          <a
            onClick={async (): Promise<void> => {
              const sigResult = await verifySignature(pcd);
              setError(sigResult.errorMessage);
              setSigStatus(sigResult.isValid ? 1 : -1);
            }}
            style={{
              color: isValidSig ? "#5B952C" : undefined,
              textDecoration: isValidSig ? "none" : undefined
            }}
          >
            <span style={{ paddingRight: 8 }}>
              {sigStatus === 0
                ? "Check signature"
                : isValidSig
                ? "Valid signature"
                : error !== undefined
                ? "Signature error!"
                : "Bad signature!"}
            </span>
            {isValidSig && <VIcon />}
            {error === undefined ? null : (
              <ErrorContainer>{error}</ErrorContainer>
            )}
          </a>
        </div>
        {hasCollectableContent && (
          <SlidingTabs
            initialIndex={displayFormat === PODDisplayFormat.POD ? 1 : 0}
            onChange={(tab) => {
              setDisplayFormat(tab);
            }}
            tabs={[
              {
                value: PODDisplayFormat.Collectable,
                label: getFormatDisplayName(PODDisplayFormat.Collectable)
              },
              {
                value: PODDisplayFormat.POD,
                label: getFormatDisplayName(PODDisplayFormat.POD)
              }
            ]}
          />
        )}
      </CardWrapper>
    </Container>
  );
}

function getFormatDisplayName(displayFormat: PODDisplayFormat): string {
  switch (displayFormat) {
    case PODDisplayFormat.POD:
      return "POD";
    case PODDisplayFormat.Collectable:
      return "Card";
  }
}

function getPreferredDisplayFormat(
  podpcd: PODPCD
): PODDisplayFormat | undefined {
  const displayEntry = podpcd.claim.entries["zupass_display"]?.value;
  if (
    displayEntry !== undefined &&
    typeof displayEntry === "string" &&
    displayEntry !== PODDisplayFormat.POD
  ) {
    if (
      Object.values(PODDisplayFormat).indexOf(
        displayEntry as PODDisplayFormat
      ) !== -1
    ) {
      return displayEntry as PODDisplayFormat;
    }
  }
  return undefined;
}

async function verifySignature(pcd: PODPCD): Promise<{
  isValid: boolean;
  errorMessage?: string;
}> {
  try {
    const isValid = await PODPCDPackage.verify(pcd);
    return { isValid };
  } catch (e) {
    return { isValid: false, errorMessage: getErrorMessage(e) };
  }
}
