import { styled } from "@pcd/passport-ui";
import { PCDUI } from "@pcd/pcd-types";
import { PODValue } from "@pcd/pod";
import { PODPCD } from "@pcd/pod-pcd";
import { useState } from "react";
import { DefaultPODPCDCardBody } from "./renderers/DefaultPODPCDCardBody";

export const PODPCDUI: PCDUI<PODPCD> = {
  renderCardBody: PODPCDCardBody
};

/**
 * This component renders the body of a 'Card' that Zupass uses to display PCDs to the user.
 */
function PODPCDCardBody({ pcd }: { pcd: PODPCD }): JSX.Element {
  const [sigStatus, setSigStatus] = useState("unvalidated");

  switch (pcd.claim.entries["zupass_display"]) {
    case "collectable" as unknown as PODValue:
      return <DefaultPODPCDCardBody pcd={pcd} />;
    default:
      return <DefaultPODPCDCardBody pcd={pcd} />;
  }
}

export const Container = styled.div`
  padding: 16px;
  overflow: hidden;
  width: 100%;
`;
