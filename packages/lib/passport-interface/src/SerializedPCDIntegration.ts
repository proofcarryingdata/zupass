import { PCDOf, PCDPackage } from "@pcd/pcd-types";
import { useEffect, useState } from "react";

export function useSerializedPCD<T extends PCDPackage>(
  proofPackage: T,
  serializedPCD: string
): PCDOf<T> | undefined {
  const [pcd, setPCD] = useState<PCDOf<T>>();

  useEffect(() => {
    if (serializedPCD) {
      const parsedPCD = JSON.parse(decodeURIComponent(serializedPCD));
      if (parsedPCD.type !== proofPackage.name) {
        return;
      }
      proofPackage.deserialize(parsedPCD.pcd).then((pcd) => {
        setPCD(pcd as PCDOf<T>);
      });
    }
  }, [proofPackage, serializedPCD, setPCD]);

  return pcd;
}
