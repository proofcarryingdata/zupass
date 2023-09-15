import {
  openGroupMembershipPopup,
  usePassportPopupMessages,
  useSemaphoreGroupProof
} from "@pcd/passport-interface";
import { useState } from "react";
import { CodeLink, CollapsableCode, HomeLink } from "../../components/Core";
import { ExampleContainer } from "../../components/ExamplePage";
import { PCDPASS_SEMAPHORE_GROUP_URL, PCDPASS_URL } from "../../constants";

/**
 * Example page which shows how to use a Zuzalu-specific prove screen to
 * request a Semaphore Group Membership PCD as a third party developer.
 */
export default function Page() {
  // Populate PCD from either client-side or server-side proving using passport popup
  const [pcdStr, _passportPendingPCDStr] = usePassportPopupMessages();

  const [valid, setValid] = useState<boolean | undefined>();
  const onVerified = (valid: boolean) => {
    setValid(valid);
  };

  const { proof, group } = useSemaphoreGroupProof(
    pcdStr,
    PCDPASS_SEMAPHORE_GROUP_URL,
    "consumer-client",
    onVerified
  );

  return (
    <>
      <HomeLink />
      <h2>PCDpass Semaphore Group Membership Proof</h2>
      <p>
        This page shows a working example of an integration with the PCDpass
        application which requests and verifies that a particular user is a
        registered user of PCDpass.
      </p>
      <p>
        The PCDpass Semaphore Group is maintained by the Passport Server
        application. To be able to use this flow in production, to be able to
        generate this proof, you have to have signed in on{" "}
        <a href={"https://pcdpass.xyz"}>pcdpass.xyz</a>. To use this flow
        locally, you either have to sign in on a local instance of the passport.
      </p>
      <p>
        The underlying PCD that this example uses is{" "}
        <code>SempahoreGroupPCD</code>. You can find more documentation
        regarding this PCD{" "}
        <CodeLink file="/tree/main/packages/semaphore-group-pcd">
          here on GitHub
        </CodeLink>{" "}
        .
      </p>
      <ExampleContainer>
        <button
          onClick={() =>
            openGroupMembershipPopup(
              PCDPASS_URL,
              window.location.origin + "#/popup",
              PCDPASS_SEMAPHORE_GROUP_URL,
              "consumer-client"
            )
          }
          disabled={valid}
        >
          Request PCDpass Membership Proof
        </button>
        {proof != null && (
          <>
            <p>Got PCDpass Membership Proof from Passport</p>
            <CollapsableCode code={JSON.stringify(proof, null, 2)} />
            {group && <p>✅ Loaded group, {group.members.length} members</p>}
            {valid === undefined && <p>❓ Proof verifying</p>}
            {valid === false && <p>❌ Proof is invalid</p>}
            {valid === true && <p>✅ Proof is valid</p>}
          </>
        )}
        {valid && <p>Welcome, anon</p>}
      </ExampleContainer>
    </>
  );
}
