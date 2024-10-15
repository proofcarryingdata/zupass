import { styled } from "@pcd/passport-ui";
import { PODValue } from "@pcd/pod";
import { PODPCD } from "@pcd/pod-pcd";

const CardImg = styled.img`
  border-radius: 8px;
`;
const CardTitle = styled.p`
  color: var(--text-primary, #1e2c50);
  text-transform: uppercase;
  padding-top: 4px;
  font-family: Barlow;
  font-size: 18px;
  font-style: normal;
  font-weight: 800;
`;
const CardDescription = styled.p`
  color: var(--text-primary, #1e2c50);

  font-family: Rubik;
  font-size: 14px;
  font-style: normal;
  font-weight: 400;
`;

export function CollectablePODPCDCardBody({
  pcd
}: {
  pcd: PODPCD;
}): JSX.Element {
  const parts: React.ReactNode[] = [];

  const imageUrlEntry: PODValue | undefined =
    pcd.claim.entries["zupass_image_url"];
  if (imageUrlEntry?.type === "string") {
    parts.push(<CardImg src={imageUrlEntry.value} />);
  }

  const detailsParts: React.ReactNode[] = [];

  const titleEntry: PODValue | undefined = pcd.claim.entries["zupass_title"];
  if (titleEntry?.type === "string") {
    detailsParts.push(<CardTitle>{titleEntry.value}</CardTitle>);
  }
  const descriptionEntry: PODValue | undefined =
    pcd.claim.entries["zupass_description"];
  if (descriptionEntry?.type === "string") {
    detailsParts.push(
      <CardDescription>{descriptionEntry.value}</CardDescription>
    );
  }

  if (detailsParts.length > 0) {
    parts.push(<div style={{ paddingLeft: 12 }}>{detailsParts}</div>);
  }

  if (parts.length === 0) {
    parts.push(<p>No content</p>);
  }

  return <>{parts}</>;
}
