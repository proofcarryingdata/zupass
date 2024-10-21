import { styled } from "@pcd/passport-ui";
import { PODValue } from "@pcd/pod";
import {
  PODPCD,
  getDescriptionEntry,
  getImageUrlEntry,
  getTitleEntry
} from "@pcd/pod-pcd";

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

  const imageUrlEntry: PODValue | undefined = getImageUrlEntry(pcd);
  if (imageUrlEntry?.type === "string") {
    parts.push(<CardImg src={imageUrlEntry.value} />);
  }

  const detailsParts: React.ReactNode[] = [];

  // should we change this to use getDisplayOptions?
  const titleEntry: PODValue | undefined = getTitleEntry(pcd);
  if (titleEntry?.type === "string") {
    detailsParts.push(<CardTitle>{titleEntry.value}</CardTitle>);
  }
  const descriptionEntry: PODValue | undefined = getDescriptionEntry(pcd);
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
