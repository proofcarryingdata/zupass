import { constructPassportPcdGetWithoutProvingRequestUrl } from "@pcd/passport-interface";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { HomeLink } from "../../components/Core";
import { ExampleContainer } from "../../components/ExamplePage";
import { PASSPORT_URL } from "../../src/constants";
import { sendPassportRequest } from "../../src/util";

/**
 * Example page which shows how to use the generic prove screen to
 * request a Semaphore Signature PCD as a third party developer.
 */
export default function Page() {
  return (
    <>
      <HomeLink />
      <h2>Generic Semaphore Signature Proof</h2>
      <p>
        This page shows a working example of an integration with the Zuzalu
        Passport application which requests and verifies that a particular user
        is a member of the Zuzalu Residents Semaphore Group. Although the data
        that is returned is not specific for Zuzalu, this specific request shows
        a specific screen within the passport which was specifically designed
        for Zuzalu.
      </p>
      <ExampleContainer>
        <button onClick={getProofWithoutProving}>
          get pcd without proving
        </button>
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
