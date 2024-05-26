import { PODValue } from "@pcd/pod";
import { PODPCD, PODPCDPackage } from "@pcd/pod-pcd";
import { useState } from "react";
import { Container } from "../shared";

export function CollectablePODPCDCardBody({
  pcd
}: {
  pcd: PODPCD;
}): JSX.Element {
  const [sigStatus, setSigStatus] = useState("unvalidated");

  const parts: React.ReactNode[] = [];

  const imageUrlEntry: PODValue | undefined =
    pcd.claim.entries["zupass_image_url"];
  if (imageUrlEntry?.type === "string") {
    parts.push(<img src={imageUrlEntry.value} />);
  }

  const descriptionEntry: PODValue | undefined =
    pcd.claim.entries["zupass_description"];
  if (descriptionEntry?.type === "string") {
    parts.push(<p>{descriptionEntry.value}</p>);
  }

  if (parts.length === 0) {
    parts.push(<p>No content</p>);
  }

  return (
    <Container>
      {parts}
      <label>
        <button
          style={{
            marginRight: "8px"
          }}
          onClick={async (): Promise<void> =>
            setSigStatus(
              (await PODPCDPackage.verify(pcd)) ? "valid ✅" : "invalid ❌"
            )
          }
        >
          Check
        </button>
        Signature is {sigStatus}
      </label>
    </Container>
  );
}
