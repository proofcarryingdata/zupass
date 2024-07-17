import { PODPipelineOutput, VerifiedCredential } from "@pcd/passport-interface";
import { PODEntries } from "@pcd/pod";
import { PODAtom } from "../PODPipeline";

/**
 * Atoms are built during Pipeline load, using values from the pipeline
 * input. Constant "configured" values and values extracted from the user's
 * credential are not included at that time.
 *
 * This function takes the atom, the pipeline output, and the user's credential,
 * and returns the final POD entries before signing.
 *
 * @param atom The atom containing POD entries
 * @param output The pipeline output configuration
 * @param credential The user's credential
 * @returns The finalized POD entries
 */
export function finalizeAtom(
  atom: PODAtom,
  output: PODPipelineOutput,
  credential: VerifiedCredential & Required<Pick<VerifiedCredential, "email">>
): PODEntries {
  const newEntries: PODEntries = {};

  for (const [name, entry] of Object.entries(output.entries)) {
    if (entry.source.type === "configured") {
      newEntries[name] = {
        type: "string",
        value: entry.source.value
      };
    } else if (entry.source.type === "credentialSemaphoreID") {
      newEntries[name] = {
        type: "cryptographic",
        value: BigInt(credential.semaphoreId)
      };
    } else if (entry.source.type === "credentialEmail") {
      newEntries[name] = {
        type: "string",
        value: credential.email
      };
    }
  }

  return { ...atom.entries, ...newEntries };
}
