import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { config } from "./config";
import { Dispatcher } from "./dispatch";
import { ZuState } from "./state";

// Starts polling the participant record, in the background.
export async function pollParticipant(state: ZuState, dispatch: Dispatcher) {
  const proof = await SemaphoreSignaturePCDPackage.prove({
    identity: {
      argumentType: ArgumentTypeName.PCD,
      value: await SemaphoreIdentityPCDPackage.serialize(
        await SemaphoreIdentityPCDPackage.prove({ identity: state.identity })
      ),
    },
    signedMessage: {
      argumentType: ArgumentTypeName.String,
      value: "proof",
    },
  });
  const serializedProof = JSON.stringify(
    await SemaphoreSignaturePCDPackage.serialize(proof)
  );
  const url = `${
    config.passportServer
  }/zuzalu/participant/proved/${encodeURIComponent(serializedProof)}`;

  console.log(`Polling ${url}`);
  try {
    const response = await fetch(url);
    if (!response.ok) {
      // TODO: show as "MISSING" or maybe "REMOVED"?
      console.log("Participant not found, skipping update");
      return;
    }
    const participant = await response.json();
    dispatch({ type: "set-self", self: participant });
  } catch (e) {
    console.error("Error polling participant", e);
  }
}
