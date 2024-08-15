import {
  PODPipelineOutput,
  VerifiedCredentialWithEmail
} from "@pcd/passport-interface";
import { PODContent, PODEntries, PODValue } from "@pcd/pod";
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
  credential: VerifiedCredentialWithEmail
): PODEntries {
  const newEntries: PODEntries = {};

  for (const [name, entry] of Object.entries(output.entries)) {
    if (entry.source.type === "credentialSemaphoreID") {
      newEntries[name] = {
        type: "cryptographic",
        value: BigInt(credential.semaphoreId)
      } satisfies PODValue;
    } else if (entry.source.type === "credentialEmail") {
      newEntries[name] = {
        type: "string",
        value: credential.email
      } satisfies PODValue;
    }
  }

  // PODContent will sort the entry keys. We could duplicate that logic here
  // but using PODContent ensures that we remain up-to-date with any logic that
  // POD uses for sorting and validating entries and their keys.
  const sortedEntries = PODContent.fromEntries({
    ...atom.entries,
    ...newEntries
  }).asEntries();

  return sortedEntries;
}