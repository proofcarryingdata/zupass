import { PCD } from "@pcd/pcd-types";
import { PODValue } from "@pcd/pod";
import { PODPCDClaim, PODPCDProof } from "./PODPCD";

// Custom schema rendering logic -- long-term, we should switch this out with a schema library

export function getTitleEntry(pcd: PCD<PODPCDClaim, PODPCDProof>): PODValue {
  if (pcd.claim.entries["pod_type"]?.value === "frogcrypto.frog") {
    return pcd.claim.entries["name"];
  }

  return pcd.claim.entries["zupass_title"];
}

export function getDescriptionEntry(
  pcd: PCD<PODPCDClaim, PODPCDProof>
): PODValue {
  if (pcd.claim.entries["pod_type"]?.value === "frogcrypto.frog") {
    return pcd.claim.entries["description"];
  }

  return pcd.claim.entries["zupass_description"];
}

export function getImageUrlEntry(pcd: PCD<PODPCDClaim, PODPCDProof>): PODValue {
  if (pcd.claim.entries["pod_type"]?.value === "frogcrypto.frog") {
    return pcd.claim.entries["imageUrl"];
  }

  return pcd.claim.entries["zupass_image_url"];
}
