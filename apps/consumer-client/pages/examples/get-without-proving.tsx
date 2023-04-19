import {
  constructPassportPcdGetWithoutProvingRequestUrl,
  usePassportPopupMessages,
} from "@pcd/passport-interface";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { useMemo } from "react";
import { CollapsableCode, HomeLink } from "../../components/Core";
import { ExampleContainer } from "../../components/ExamplePage";
import { PASSPORT_URL } from "../../src/constants";
import { sendPassportRequest } from "../../src/util";

/**
 * Example page which shows how to get a PCD from the passport without
 * proving it first.
 */
export default function Page() {
  const [passportPCDStr] = usePassportPopupMessages();

  const formatted = useMemo(() => {
    try {
      return JSON.stringify(JSON.parse(passportPCDStr), null, 2);
    } catch (e) {
      return null;
    }
  }, [passportPCDStr]);

  return (
    <>
      <HomeLink />
      <h2>Get Without Proving</h2>
      <p>
        This page shows a working example of how to request a PCD from the
        passport without proving it first.
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

function getProofWithoutProving() {
  const url = constructPassportPcdGetWithoutProvingRequestUrl(
    PASSPORT_URL,
    window.location.origin + "/popup",
    SemaphoreSignaturePCDPackage.name
  );
  sendPassportRequest(url);
}
