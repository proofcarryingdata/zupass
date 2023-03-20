import { PCDOf, PCDPackage } from "@pcd/pcd-types";
import { useEffect, useState } from "react";

export function retrieveProof(proofPackage: PCDPackage) {
  const [proof, setProof] = useState<PCDOf<typeof proofPackage>>();

  useEffect(() => {
    const url = new URL(window.location.href);
    const proofEnc = url.searchParams.get("proof");
    if (proofEnc) {
      const parsedPCD = JSON.parse(decodeURIComponent(proofEnc));
      if (parsedPCD.type !== proofPackage.name) {
        return;
      }
      proofPackage.deserialize(parsedPCD.pcd).then((pcd) => {
        setProof(pcd);
      });
    }
  }, []);

  return proof;
}
