import {
  openZuzaluMembershipPopup,
  usePassportPopupMessages,
  useSemaphoreGroupProof,
} from "@pcd/passport-interface";
import { useState } from "react";
import { CodeLink, CollapsableCode, HomeLink } from "../../components/Core";
import { ExampleContainer } from "../../components/ExamplePage";
import { PASSPORT_URL, SEMAPHORE_GROUP_URL } from "../../src/constants";

/**
 * Example page which shows how to use a Zuzalu-specific prove screen to
 * request a Semaphore Group Membership PCD as a third party developer.
 */
export default function Page() {
  // Populate PCD from either client-side or server-side proving using passport popup
  const [pcdStr, _passportPendingPCDStr] = usePassportPopupMessages();

  const [messageToSign, setMessageToSign] = useState<string | undefined>(
    undefined
  );

  const [valid, setValid] = useState<boolean | undefined>();
  const onVerified = (valid: boolean) => {
    setValid(valid);
  };

  const { proof, group } = useSemaphoreGroupProof(
    pcdStr,
    SEMAPHORE_GROUP_URL,
    "consumer-client",
    onVerified,
    messageToSign
  );

  return (
    <>
      <HomeLink />
      <h2>Zuzalu Semaphore Group Membership Proof</h2>
      <p>
        This page shows a working example of an integration with the Zuzalu
        Passport application which requests and verifies that a particular user
        is a member of the Zuzalu Residents Semaphore Group.
      </p>
      <p>
        The Zuzalu Residents Semaphore Group is maintained by the Passport
        Server application. To be able to use this flow in production, to be
        able to generate this proof, you have to have signed in on{" "}
        <a href={"https://zupass.org"}>zupass.org</a>. To use this flow locally,
        you either have to sign in as a valid Zuzalu Resident which was synced
        from Pretix, or you have to have started the local development
        environment with the <code>BYPASS_EMAIL_REGISTRATION</code> environment
        variable set to <code>true</code>, which allows you to log in
        development mode without being a resident.
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
        <input
          style={{ marginBottom: "8px" }}
          placeholder="Message to group sign"
          type="text"
          value={messageToSign}
          onChange={(e) => setMessageToSign(e.target.value)}
        />
        <br />
        <button
          onClick={() =>
            openZuzaluMembershipPopup(
              PASSPORT_URL,
              window.location.origin + "/popup",
              SEMAPHORE_GROUP_URL,
              "consumer-client",
              messageToSign
            )
          }
          disabled={valid}
        >
          Request Zuzalu Membership Proof
        </button>
        {proof != null && (
          <>
            <p>Got Zuzalu Membership Proof from Passport</p>
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
