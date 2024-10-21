import { PCD, SerializedPCD } from "@pcd/pcd-types";
import { useEffect, useState } from "react";
import { usePCDCollection } from "./appHooks";

/**
 * Hook that deserializes a given PCD, or returns an error.
 */
export function useDeserialized(pcd: SerializedPCD): {
  pcd?: PCD | undefined;
  error?: Error | undefined;
} {
  const pcds = usePCDCollection();
  const [deserialized, setDeserialized] = useState<PCD | undefined>();
  const [error, setError] = useState<Error | undefined>();

  useEffect(() => {
    async function process(): Promise<void> {
      try {
        console.log("deserializing", pcd);
        const pcdPackage = pcds.getPackage(pcd.type);
        if (!pcdPackage) {
          throw new Error(`PCD Package type ${pcd.type} not found`);
        }
        const deserialized = await pcdPackage.deserialize(pcd.pcd);
        console.log("deserialized pcd", deserialized);
        setDeserialized(deserialized);
      } catch (e) {
        console.error("error deserializing pcd", e);
        setError(e instanceof Error ? e : new Error("Error deserializing PCD"));
      }
    }

    process();
  }, [pcd, pcds]);

  return {
    pcd: deserialized,
    error
  };
}
