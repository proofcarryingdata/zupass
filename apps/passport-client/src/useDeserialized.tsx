import { PCD, SerializedPCD } from "@pcd/pcd-types";
import { useContext, useEffect, useState } from "react";
import { DispatchContext } from "./dispatch";

export function useDeserialized(pcd: SerializedPCD): {
  pcd?: PCD | undefined;
  error?: Error | undefined;
} {
  const [state] = useContext(DispatchContext);
  const [deserialized, setDeserialized] = useState<PCD | undefined>();
  const [error, setError] = useState<Error | undefined>();

  useEffect(() => {
    async function process() {
      try {
        console.log("deserializing", pcd);
        const pcdPackage = state.pcds.getPackage(pcd.type);
        const deserialized = await pcdPackage.deserialize(pcd.pcd);
        console.log("deserialized pcd", deserialized);
        setDeserialized(deserialized);
      } catch (e) {
        console.log("error deserializing pcd", e);
        setError(e);
      }
    }

    process();
  }, [state, pcd]);

  return {
    pcd: deserialized,
    error,
  };
}
