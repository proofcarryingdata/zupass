import { Button, Separator } from "@pcd/passport-ui";
import { PCDUI } from "@pcd/pcd-types";
import { PODPCD, PODPCDPackage } from "@pcd/pod-pcd";
import { useState } from "react";
import { CollectablePODPCDCardBody } from "./renderers/CollectablePODPCDCardBody";
import { DefaultPODPCDCardBody } from "./renderers/DefaultPODPCDCardBody";
import { Container } from "./shared";

export const PODPCDUI: PCDUI<PODPCD> = {
  renderCardBody: PODPCDCardBody
};

const DEF_POD_DISPLAY_FORMATS = ["pod", "card", "collectable"] as const;
type PODDisplayFormat = (typeof DEF_POD_DISPLAY_FORMATS)[number];
const ALL_POD_DISPLAY_FORMATS: string[] = [...DEF_POD_DISPLAY_FORMATS];
const DISPLAY_FORMAT_NAMES = {
  pod: "POD",
  collectable: "Card",
  card: "Card"
};

/**
 * This component renders the body of a 'Card' that Zupass uses to display PCDs to the user.
 */
function PODPCDCardBody({ pcd }: { pcd: PODPCD }): JSX.Element {
  const [sigStatus, setSigStatus] = useState<number>(0);

  const availableDisplayFormat = getPreferredDisplayFormat(pcd);
  const [displayFormat, setDisplayFormat] = useState<PODDisplayFormat>(
    availableDisplayFormat || "pod"
  );
  const otherDisplayFormat =
    displayFormat === "pod" ? availableDisplayFormat : "pod";

  let content = <></>;
  switch (displayFormat) {
    case "collectable":
      content = <CollectablePODPCDCardBody pcd={pcd} />;
      break;
    case "pod":
    // Fallthrough
    default:
      content = <DefaultPODPCDCardBody pcd={pcd} />;
      break;
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
          {otherDisplayFormat === undefined
            ? "No display info"
            : `View as ${DISPLAY_FORMAT_NAMES[otherDisplayFormat]}`}
        </Button>
      )}

      <Button
        style={
          sigStatus === 0 ? "primary" : sigStatus > 0 ? "outline" : "danger"
        }
        size="small"
        onClick={async (): Promise<void> =>
          setSigStatus((await PODPCDPackage.verify(pcd)) ? 1 : -1)
        }
        styles={{ float: "right" }}
      >
        {sigStatus === 0
          ? "Check signature"
          : sigStatus > 0
          ? "Signature is valid"
          : "Signature invalid!"}
      </Button>
    </Container>
  );
}

function getPreferredDisplayFormat(
  podpcd: PODPCD
): PODDisplayFormat | undefined {
  const displayEntry = podpcd.claim.entries["zupass_display"]?.value;
  if (displayEntry !== undefined && typeof displayEntry === "string") {
    if (ALL_POD_DISPLAY_FORMATS.indexOf(displayEntry)) {
      return displayEntry as PODDisplayFormat;
    }
  }
  return undefined;
}
