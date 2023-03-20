import { PCDOf, PCDPackage } from "@pcd/pcd-types";
import { useEffect, useState } from "react";

export function retrieveProof(proofPackage: PCDPackage) {
  const [proof, setProof] = useState<PCDOf<typeof proofPackage>>();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const proofEnc = params.get("proof");
    if (proofEnc) {
      const parsedPCD = JSON.parse(decodeURIComponent(proofEnc));
      if (parsedPCD.type !== proofPackage.name) {
        return;
      }
      proofPackage.deserialize(parsedPCD.pcd).then((pcd) => {
        setProof(pcd);
        window.history.replaceState({}, document.title, "/");
      });
    }
  }, []);

  return [proof, setProof];
}
