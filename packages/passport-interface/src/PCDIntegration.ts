import { PCDOf, PCDPackage } from "@pcd/pcd-types";
import { useEffect, useState } from "react";

export function useDeserializedPCD<T extends PCDPackage>(
  proofPackage: T,
  serializedPCD: string
) {
  const [proof, setProof] = useState<PCDOf<T>>();

  useEffect(() => {
    if (serializedPCD) {
      const parsedPCD = JSON.parse(decodeURIComponent(serializedPCD));
      if (parsedPCD.type !== proofPackage.name) {
        return;
      }
      proofPackage.deserialize(parsedPCD.pcd).then((pcd) => {
        setProof(pcd as any);
      });
    }
  }, [proofPackage, serializedPCD, setProof]);

  return proof;
}
