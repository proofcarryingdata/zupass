import { PODPCD } from "@pcd/pod-pcd";
import { useState } from "react";
import { Container } from "../CardBody";

export function CollectablePODPCDCardBody({
  pcd
}: {
  pcd: PODPCD;
}): JSX.Element {
  const [sigStatus, setSigStatus] = useState("unvalidated");

  return <Container>this is a collectable</Container>;
}
