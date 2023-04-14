import { constructPassportPcdProveAndAddRequestUrl } from "@pcd/passport-interface";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreGroupPCDPackage } from "@pcd/semaphore-group-pcd";
import { HomeLink } from "../../components/Core";
import { ExampleContainer } from "../../components/ExamplePage";
import { PASSPORT_URL, SEMAPHORE_GROUP_URL } from "../../src/constants";
import { sendPassportRequest } from "../../src/util";

export default function Page() {
  // const { response, error } = usePassportResponse();

  return (
    <div>
      <HomeLink />
      <h2>Prove and Add</h2>
      <ExampleContainer>
        <button onClick={onAddClick}>
          add a new semaphore identity to the passport
        </button>
        {/* TODO: implement response and error */}
        {/* {response && (
          <>
            <CollapsableCode code={JSON.stringify(response, null, 2)} />
          </>
        )}
        {error && (
          <>
            <CollapsableCode code={error.message} />
          </>
        )} */}
      </ExampleContainer>
    </div>
  );
}

async function onAddClick() {
  const url = constructPassportPcdProveAndAddRequestUrl<
    typeof SemaphoreGroupPCDPackage
  >(
    PASSPORT_URL,
    window.location.origin + "/popup",
    SemaphoreGroupPCDPackage.name,
    {
      externalNullifier: {
        argumentType: ArgumentTypeName.BigInt,
        userProvided: true,
        value: "1",
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
        value: "1",
        description:
          "The message you are signing with your Semaphore identity.",
      },
    },
    {
      genericProveScreen: true,
      description:
        "Generate a group membership proof using your passport's Semaphore Identity.",
      title: "Group Membership Proof",
    }
  );

  sendPassportRequest(url);
}
