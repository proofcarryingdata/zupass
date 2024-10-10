import {
  Button,
  ErrorContainer,
  Separator,
  SlidingTabs,
  VIcon
} from "@pcd/passport-ui";
import { PCDUI } from "@pcd/pcd-types";
import { PODPCD, PODPCDPackage } from "@pcd/pod-pcd";
import { getErrorMessage } from "@pcd/util";
import { useState } from "react";
import { CollectablePODPCDCardBody } from "./renderers/CollectablePODPCDCardBody";
import { DefaultPODPCDCardBody2 } from "./renderers/DefaultPODPCDCardBody";
import { Container } from "./shared";

export const PODPCDUI: PCDUI<PODPCD> = {
  renderCardBody: PODPCDCardBody
};

enum PODDisplayFormat {
  POD = "pod",
  Collectable = "collectable"
}

const newui = true;
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
      content = <DefaultPODPCDCardBody2 pcd={pcd} />;
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
  if (newui) {
    const isValidSig = sigStatus > 0;
    return (
      <Container>
        <div
          style={{
            padding: 12,
            borderRadius: 12,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            border: "1px solid rgba(0, 0, 0, 0.10)",
            boxShadow: "0px 1px 2px 0px rgba(0, 0, 0, 0.05)"
          }}
        >
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
            </a>
          </div>
          <SlidingTabs
            initialIndex={displayFormat === PODDisplayFormat.POD ? 1 : 0}
            onChange={(tab) => {
              setDisplayFormat(tab);
            }}
            tabs={[
              { value: PODDisplayFormat.Collectable, label: "CARD" },
              { value: PODDisplayFormat.POD, label: "POD" }
            ]}
          />
        </div>
      </Container>
    );
  }
  return (
    <Container>
      {content}

      <Separator />
      {otherDisplayFormat === undefined ? null : (
        <Button
          style="primary"
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
          const sigResult = await verifySignature(pcd);
          setError(sigResult.errorMessage);
          setSigStatus(sigResult.isValid ? 1 : -1);
        }}
        styles={{ float: "right", ...sigButtonColor }}
      >
        {sigStatus === 0
          ? "Check signature"
          : sigStatus > 0
          ? "Valid signature"
          : error !== undefined
          ? "Signature error!"
          : "Bad signature!"}
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
