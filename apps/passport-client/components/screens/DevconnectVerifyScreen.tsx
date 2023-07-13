import { decodeQRPayload } from "@pcd/passport-ui";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { sleep } from "../../src/util";
import { AppContainer } from "../shared/AppContainer";

export function DevconnectVerifyScreen() {
  const decodedPCD = useDecodedPCD();

  return (
    <AppContainer bg={"primary"}>
      {JSON.stringify(decodedPCD, null, 2)}
    </AppContainer>
  );
}

function useDecodedPCD(): string | undefined {
  const location = useLocation();
  const [decodedPCD, setDecodedPCD] = useState<string | undefined>();

  useEffect(() => {
    (async () => {
      await sleep(500);
      const pcd = await decodePCD(location);
      setDecodedPCD(pcd);
    })();
  }, [location, setDecodedPCD]);

  return decodedPCD;
}

async function decodePCD(location): Promise<string | undefined> {
  try {
    const params = new URLSearchParams(location.search);
    const encodedQRPayload = params.get("pcd");

    console.log(
      `Decoding Devconnect Ticket proof, ${encodedQRPayload.length}b gzip+base64`
    );

    const decodedQrPayload = decodeQRPayload(encodedQRPayload);
    return decodedQrPayload;
  } catch (e) {
    console.log("error decoding pcd", e);
  }

  return undefined;
}
