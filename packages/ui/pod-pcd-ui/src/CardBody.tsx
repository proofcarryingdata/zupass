import { Button, ErrorContainer, Separator } from "@pcd/passport-ui";
import { PCDUI } from "@pcd/pcd-types";
import { PODPCD, PODPCDPackage } from "@pcd/pod-pcd";
import { getErrorMessage } from "@pcd/util";
import { useState } from "react";
import { CollectablePODPCDCardBody } from "./renderers/CollectablePODPCDCardBody";
import { DefaultPODPCDCardBody } from "./renderers/DefaultPODPCDCardBody";
import { Container } from "./shared";

export const PODPCDUI: PCDUI<PODPCD> = {
  renderCardBody: PODPCDCardBody
};

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

  const availableDisplayFormat = getPreferredDisplayFormat(pcd);
  const [displayFormat, setDisplayFormat] = useState<PODDisplayFormat>(
    availableDisplayFormat || PODDisplayFormat.POD
  );
  const otherDisplayFormat =
    displayFormat === PODDisplayFormat.POD
      ? availableDisplayFormat
      : PODDisplayFormat.POD;

  let content = <></>;
  switch (displayFormat) {
    case PODDisplayFormat.Collectable:
      content = <CollectablePODPCDCardBody pcd={pcd} />;
      break;
    case PODDisplayFormat.POD:
    // Fallthrough
    default:
      content = <DefaultPODPCDCardBody pcd={pcd} />;
      break;
  }

  const sigButtonColor: React.CSSProperties = {};
  if (sigStatus > 0) {
    sigButtonColor.color = "white";
    sigButtonColor.background = "green";
  } else if (sigStatus < 0) {
    sigButtonColor.color = "white";
    sigButtonColor.background = "var(--danger)";
  }

  return (
    <Container>
      {content}

      <Separator />
      {otherDisplayFormat === undefined ? null : (
        <Button
          style="secondary"
          size="small"
          onClick={async (): Promise<void> =>
            setDisplayFormat(otherDisplayFormat || "pod")
          }
          styles={{ float: "left" }}
        >
          View as {getFormatDisplayName(otherDisplayFormat)}
        </Button>
      )}

      <Button
        style="primary"
        size="small"
        onClick={async (): Promise<void> => {
          setError(undefined);
          const sigResult = await verifySignature(pcd);
          setError(sigResult.errorMessage);
          setSigStatus(sigResult.isValid ? 1 : -1);
        }}
        styles={{ float: "right", ...sigButtonColor }}
      >
        {sigStatus === 0
          ? "Check signature"
          : sigStatus > 0
          ? "Signature is valid"
          : error !== undefined
          ? "Signature error!"
          : "Signature invalid!"}
      </Button>
      {error === undefined ? null : <ErrorContainer>{error}</ErrorContainer>}
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
