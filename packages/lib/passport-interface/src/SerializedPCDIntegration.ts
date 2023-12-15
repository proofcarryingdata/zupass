import { PCDOf, PCDPackage } from "@pcd/pcd-types";
import { useEffect, useState } from "react";

export function useSerializedPCD<T extends PCDPackage>(
  proofPackage: T,
  serializedPCD: string
) {
  const [pcd, setPCD] = useState<PCDOf<T>>();

  useEffect(() => {
    if (serializedPCD) {
      const parsedPCD = JSON.parse(decodeURIComponent(serializedPCD));
      if (parsedPCD.type !== proofPackage.name) {
        return;
      }
      proofPackage.deserialize(parsedPCD.pcd).then((pcd) => {
        setPCD(pcd as any);
      });
    }
  }, [proofPackage, serializedPCD, setPCD]);

  return pcd;
}
