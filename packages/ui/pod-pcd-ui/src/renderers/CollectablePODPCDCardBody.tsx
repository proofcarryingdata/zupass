import { PODValue } from "@pcd/pod";
import { PODPCD } from "@pcd/pod-pcd";
import { Container } from "../shared.js";

export function CollectablePODPCDCardBody({
  pcd
}: {
  pcd: PODPCD;
}): JSX.Element {
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

  return <Container>{parts}</Container>;
}
