import { styled } from "@pcd/passport-ui";
import { PCDUI } from "@pcd/pcd-types";
import { PODPCD } from "@pcd/pod-pcd";
import { CollectablePODPCDCardBody } from "./renderers/CollectablePODPCDCardBody";
import { DefaultPODPCDCardBody } from "./renderers/DefaultPODPCDCardBody";

export const PODPCDUI: PCDUI<PODPCD> = {
  renderCardBody: PODPCDCardBody
};

/**
 * This component renders the body of a 'Card' that Zupass uses to display PCDs to the user.
 */
function PODPCDCardBody({ pcd }: { pcd: PODPCD }): JSX.Element {
  let content = <></>;

  switch (pcd.claim.entries["zupass_display"].value) {
    case "collectable":
      content = <CollectablePODPCDCardBody pcd={pcd} />;
      break;
    default:
      content = <DefaultPODPCDCardBody pcd={pcd} />;
      break;
  }

  return <>{content}</>;
}

export const Container = styled.div`
  padding: 16px;
  overflow: hidden;
  width: 100%;
`;
