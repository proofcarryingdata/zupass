import { PCDOf, PCDPackage } from "@pcd/pcd-types";
import { useEffect, useState } from "react";

export function useProof<T extends PCDPackage>(
  proofPackage: T,
  proofEnc: string
) {
  const [proof, setProof] = useState<PCDOf<T>>();

  useEffect(() => {
    if (proofEnc) {
      const parsedPCD = JSON.parse(proofEnc);
      if (parsedPCD.type !== proofPackage.name) {
        return;
      }
      proofPackage.deserialize(parsedPCD.pcd).then((pcd) => {
        setProof(pcd as any);
      });
    }
  }, [proofPackage, proofEnc, setProof]);

  return proof;
}
