import {
  constructPassportPcdGetRequestUrl,
  useSemaphorePassportProof,
} from "@pcd/passport-interface";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreGroupPCDPackage } from "@pcd/semaphore-group-pcd";
import { useEffect, useState } from "react";
import { CodeLink, CollapsableCode, HomeLink } from "../../components/Core";
import { ExampleContainer } from "../../components/ExamplePage";
import { IS_PROD, PASSPORT_URL } from "../../src/constants";
import { requestProofFromPassport } from "../../src/util";

const SEMAPHORE_GROUP_URL = IS_PROD
  ? "https://api.pcd-passport.com/semaphore/1"
  : "http://localhost:3002/semaphore/1";

export default function Web() {
  // Raw string-encoded PCD
  const [pcdStr, setPcdStr] = useState("");
  const [debugChecked, setDebugChecked] = useState(true);

  // Semaphore Group PCD
  const { proof, group, valid, error } = useSemaphorePassportProof(
    SEMAPHORE_GROUP_URL,
    pcdStr
  );

  useEffect(() => {
    if (error) {
      console.error("error using semaphore passport proof", error);
    }
  }, [error]);

  // Listen for PCDs coming back from the Passport popup
  useEffect(() => {
    window.addEventListener("message", receiveMessage, false);
    function receiveMessage(ev: MessageEvent<any>) {
      // This next line is important. Extensions including Metamask apparently
      // send messages to every page. Ignore those.
      if (!ev.data.encodedPcd) return;
      console.log("Received message", ev.data);
      setPcdStr(ev.data.encodedPcd);
    }
  }, []);

  return (
    <>
      <HomeLink />
      <h2>Semaphore Group Membership Proof</h2>
      <p>
        This page shows a working example of an integration with the PCD
        Passport application which requests and verifies that a particular user
        is a member of a particular Semaphore Group.
      </p>
      <p>
        The group we are using for demonstration purposes is the Zuzalu
        Residents group, however this example is intended to be a more generic
        example and to be able to be used for groups and purposes other than
        Zuzalu. To test this flow locally, you should start the local
        development environment with the <code>BYPASS_EMAIL_REGISTRATION</code>{" "}
        environment variable set to <code>true</code>, which allows you to log
        with any string as the email.
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
          onClick={() => requestMembershipProof(debugChecked)}
          disabled={valid}
        >
          Request Group Membership Proof
        </button>
        <label>
          <input
            type="checkbox"
            checked={debugChecked}
            onChange={(e) => {
              setDebugChecked((checked) => !checked);
            }}
          />
          debug view
        </label>

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

// Show the Passport popup, ask the user to show anonymous membership.
function requestMembershipProof(debug: boolean) {
  const proofUrl = constructPassportPcdGetRequestUrl<
    typeof SemaphoreGroupPCDPackage
  >(
    PASSPORT_URL,
    window.location.origin + "/popup",
    SemaphoreGroupPCDPackage.name,
    {
      externalNullifier: {
        argumentType: ArgumentTypeName.BigInt,
        userProvided: true,
        description:
          "You can choose a nullifier to prevent this signed message from being used across domains.",
      },
      group: {
        argumentType: ArgumentTypeName.Object,
        userProvided: false,
        remoteUrl: SEMAPHORE_GROUP_URL,
        description: "The Semaphore group which you are proving you belong to.",
      },
      identity: {
        argumentType: ArgumentTypeName.PCD,
        value: undefined,
        userProvided: true,
        description:
          "The Semaphore Identity which you are signing the message on behalf of.",
      },
      signal: {
        argumentType: ArgumentTypeName.BigInt,
        userProvided: true,
        description:
          "The message you are signing with your Semaphore identity.",
      },
    },
    {
      description:
        "Generate a group membership proof using your passport's Semaphore Identity.",
      title: "Group Membership Proof",
      debug,
    }
  );

  requestProofFromPassport(proofUrl);
}
