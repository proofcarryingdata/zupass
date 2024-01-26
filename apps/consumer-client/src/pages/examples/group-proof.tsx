import {
  constructZupassPcdGetRequestUrl,
  openZupassPopup,
  usePCDMultiplexer,
  usePendingPCD,
  useSemaphoreGroupProof,
  useZupassPopupMessages
} from "@pcd/passport-interface";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreGroupPCDPackage } from "@pcd/semaphore-group-pcd";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { generateSnarkMessageHash } from "@pcd/util";
import { useState } from "react";
import { CodeLink, CollapsableCode, HomeLink } from "../../components/Core";
import { ExampleContainer } from "../../components/ExamplePage";
import { PendingPCDStatusDisplay } from "../../components/PendingPCDStatusDisplay";
import {
  EVERYONE_SEMAPHORE_GROUP_URL,
  ZUPASS_SERVER_URL,
  ZUPASS_URL
} from "../../constants";

export default function Page(): JSX.Element {
  const [zupassPCDStr, zupassPendingPCDStr] = useZupassPopupMessages();
  const [pendingPCDStatus, pendingPCDError, serverPCDStr] = usePendingPCD(
    zupassPendingPCDStr,
    ZUPASS_SERVER_URL
  );
  const pcdStr = usePCDMultiplexer(zupassPCDStr, serverPCDStr);
  const [valid, setValid] = useState<boolean | undefined>();
  const onVerified = (valid: boolean): void => {
    setValid(valid);
  };
  const { proof, group } = useSemaphoreGroupProof(
    pcdStr,
    EVERYONE_SEMAPHORE_GROUP_URL,
    "consumer-client",
    onVerified
  );

  const [debugChecked, setDebugChecked] = useState(false);
  const [serverProving, setServerProving] = useState(false);

  return (
    <>
      <HomeLink />
      <h2>Generic Semaphore Group Membership Proof</h2>
      <p>
        This page shows a working example of a 3rd party application that asks
        Zupass for a Semaphore group membership proof.
      </p>
      <p>
        The group we are using for demonstration purposes is a group that Zupass
        maintains, which contains all of its users. I.e. anyone who has a Zupass
        account should be able to successfully prove that to this 3rd party
        application.
      </p>
      <p>
        The underlying PCD that this example uses is{" "}
        <code>SempahoreGroupPCD</code>. You can find more documentation
        regarding this PCD{" "}
        <CodeLink file="/tree/main/packages/semaphore-group-pcd">
          here on GitHub
        </CodeLink>
        .
      </p>
      <ExampleContainer>
        <button
          onClick={(): void =>
            requestMembershipProof(
              debugChecked,
              serverProving,
              "consumer-client"
            )
          }
          disabled={valid}
        >
          Request Group Membership Proof
        </button>
        <label>
          <input
            type="checkbox"
            checked={debugChecked}
            onChange={(): void => {
              setDebugChecked((checked) => !checked);
            }}
          />
          debug view
        </label>
        <label>
          <input
            type="checkbox"
            checked={serverProving}
            onChange={(): void => {
              setServerProving((checked: boolean) => !checked);
            }}
          />
          server-side proof
        </label>
        {zupassPendingPCDStr && (
          <>
            <PendingPCDStatusDisplay
              status={pendingPCDStatus}
              pendingPCDError={pendingPCDError}
            />
          </>
        )}
        {proof != null && (
          <>
            <p>Got Group Membership Proof from Zupass</p>
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

// Show Zupass popup, ask the user to prove anonymous group membership in the group
// of all registered Zupass users.
function requestMembershipProof(
  debug: boolean,
  proveOnServer: boolean,
  originalSiteName: string
): void {
  const popupUrl = window.location.origin + "#/popup";
  const proofUrl = constructZupassPcdGetRequestUrl<
    typeof SemaphoreGroupPCDPackage
  >(
    ZUPASS_URL,
    popupUrl,
    SemaphoreGroupPCDPackage.name,
    {
      externalNullifier: {
        argumentType: ArgumentTypeName.BigInt,
        userProvided: true,
        value: generateSnarkMessageHash(originalSiteName).toString(),
        description:
          "You can choose a nullifier to prevent this signed message from being used across domains."
      },
      group: {
        argumentType: ArgumentTypeName.Object,
        userProvided: false,
        remoteUrl: EVERYONE_SEMAPHORE_GROUP_URL,
        description: "The Semaphore group which you are proving you belong to."
      },
      identity: {
        argumentType: ArgumentTypeName.PCD,
        pcdType: SemaphoreIdentityPCDPackage.name,
        value: undefined,
        userProvided: true,
        description:
          "The Semaphore Identity which you are signing the message on behalf of."
      },
      signal: {
        argumentType: ArgumentTypeName.BigInt,
        userProvided: true,
        value: "1",
        description: "The message you are signing with your Semaphore identity."
      }
    },
    {
      genericProveScreen: true,
      description:
        "Generate a group membership proof using your Zupass Semaphore Identity.",
      title: "Group Membership Proof",
      debug: debug,
      proveOnServer: proveOnServer
    }
  );

  openZupassPopup(popupUrl, proofUrl);
}
