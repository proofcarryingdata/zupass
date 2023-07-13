import { decodeQRPayload } from "@pcd/passport-ui";
import { RSATicketPCD, RSATicketPCDPackage } from "@pcd/rsa-ticket-pcd";
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

function useDecodedPCD(): RSATicketPCD | undefined {
  const location = useLocation();
  const [decodedPCD, setDecodedPCD] = useState<RSATicketPCD | undefined>();

  useEffect(() => {
    (async () => {
      await sleep(500);
      const pcd = await decodePCD(location);
      setDecodedPCD(pcd);
    })();
  }, [location, setDecodedPCD]);

  return decodedPCD;
}

async function decodePCD(location): Promise<RSATicketPCD | undefined> {
  try {
    const params = new URLSearchParams(location.search);
    const encodedQRPayload = params.get("pcd");

    console.log(
      `Decoding Devconnect Ticket proof, ${encodedQRPayload.length}b gzip+base64`
    );

    const decodedQrPayload = decodeQRPayload(encodedQRPayload);
    const parsedQrPayload = JSON.parse(decodedQrPayload);
    const decodedPCD = await RSATicketPCDPackage.deserialize(
      parsedQrPayload.pcd
    );
    return decodedPCD;
  } catch (e) {
    console.log("error decoding pcd", e);
  }

  return undefined;
}
