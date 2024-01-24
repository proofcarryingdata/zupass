import {
  getWithoutProvingUrl,
  useZupassPopupMessages
} from "@pcd/passport-interface";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { useMemo } from "react";
import { CollapsableCode, HomeLink } from "../../components/Core";
import { ExampleContainer } from "../../components/ExamplePage";
import { ZUPASS_URL } from "../../constants";
import { sendZupassRequest } from "../../util";

export default function Page(): JSX.Element {
  const [zupassPCDStr] = useZupassPopupMessages();

  const formatted = useMemo(() => {
    try {
      return JSON.stringify(JSON.parse(zupassPCDStr), null, 2);
    } catch (e) {
      return null;
    }
  }, [zupassPCDStr]);

  return (
    <>
      <HomeLink />
      <h2>Get Without Proving</h2>
      <p>
        This page shows a working example of how to request a PCD from Zupass
        without proving it first.
      </p>
      <ExampleContainer>
        <button onClick={getProofWithoutProving}>
          get pcd without proving
        </button>
        {formatted && <CollapsableCode code={formatted} />}
      </ExampleContainer>
    </>
  );
}

function getProofWithoutProving(): void {
  const url = getWithoutProvingUrl(
    ZUPASS_URL,
    window.location.origin + "#/popup",
    SemaphoreSignaturePCDPackage.name
  );
  sendZupassRequest(url);
}
