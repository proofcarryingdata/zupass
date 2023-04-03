import {
  constructPassportPcdAddRequestUrl,
  usePassportResponse,
} from "@pcd/passport-interface";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { Identity } from "@semaphore-protocol/identity";
import { CollapsableCode } from "../../components/Core";
import { ExampleContainer } from "../../components/ExamplePage";
import { PASSPORT_URL } from "../../src/constants";
import { sendPassportRequest } from "../../src/util";

export default function Page() {
  const { response, error } = usePassportResponse();

  return (
    <div>
      add a pcd <br />
      <ExampleContainer>
        <button onClick={onAddClick}>
          add a new semaphore identity to the passport
        </button>
        {response && (
          <>
            <CollapsableCode code={JSON.stringify(response, null, 2)} />
          </>
        )}
        {error && (
          <>
            <CollapsableCode code={error.message} />
          </>
        )}
      </ExampleContainer>
    </div>
  );
}

async function onAddClick() {
  const newIdentity = await SemaphoreIdentityPCDPackage.prove({
    identity: new Identity(),
  });

  const serializedNewIdentity = await SemaphoreIdentityPCDPackage.serialize(
    newIdentity
  );

  const url = constructPassportPcdAddRequestUrl(
    PASSPORT_URL,
    window.location.origin + "/popup",
    serializedNewIdentity
  );

  sendPassportRequest(url);
}
