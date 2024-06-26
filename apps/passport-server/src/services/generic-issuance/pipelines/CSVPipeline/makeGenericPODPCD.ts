import {
  CSVPipelineMatchConfig,
  CSVPipelinePODEntryOptions
} from "@pcd/passport-interface";
import { ArgumentTypeName, SerializedPCD } from "@pcd/pcd-types";
import { PODEntries } from "@pcd/pod";
import { PODPCD, PODPCDPackage } from "@pcd/pod-pcd";
import { v5 as uuidv5 } from "uuid";
import { traced } from "../../../telemetryService";

export async function makeGenericPODPCD(
  inputRow: Record<string, string>,
  eddsaPrivateKey: string,
  requesterEmail: string | undefined,
  requesterSemaphoreId: string | undefined,
  pipelineId: string,
  issueToUnmatchedEmail: boolean | undefined,
  output: CSVPipelinePODEntryOptions,
  matchConfig?: CSVPipelineMatchConfig
): Promise<SerializedPCD<PODPCD> | undefined> {
  return traced("", "makeGenericPODPCD", async () => {
    if (!requesterEmail || !requesterSemaphoreId) {
      return undefined;
    }

    // PODs can be issued either to anyone who makes a request, OR to anyone
    // whose credential matches some of the values contained in the POD.
    // To issue to anyone, `issueToUnmatchedEmail` must be enabled. If it is
    // not, then some `matchConfig` must be specified.
    if (issueToUnmatchedEmail !== true && !matchConfig) {
      throw new Error("No configuration for matching requests to CSV data");
    }

    if (!issueToUnmatchedEmail) {
      // If we are matching the user by comparing their email to some value in
      // the CSV input data:
      if (matchConfig?.type === "email") {
        const emailColumnName = matchConfig.inputField;
        // Check if the column exists
        if (!(emailColumnName in inputRow)) {
          throw new Error(
            `Could not find column "${emailColumnName}" in CSV input data, could not match against user email address`
          );
        }
        // If the value does not match, no POD is issued
        if (inputRow[emailColumnName] !== requesterEmail) {
          return undefined;
        }
      }
      // If we are matching the user by comparing their Semaphore ID to some
      // value in the CSV input data:
      else if (matchConfig?.type === "semaphoreID") {
        const semaphoreIDColumnName = matchConfig.inputField;
        // Check if the column exists
        if (!(semaphoreIDColumnName in inputRow)) {
          throw new Error(
            `Could not find column "${semaphoreIDColumnName}" in CSV input data, could not match against user Semaphore ID`
          );
        }
        // If the value does not match, no POD is issued
        if (inputRow[semaphoreIDColumnName] !== requesterSemaphoreId) {
          return undefined;
        }
      }
    }

    const entries: PODEntries = {};

    // Iterate over configured POD entries
    for (const [name, entryConfig] of Object.entries(output)) {
      switch (entryConfig.source.type) {
        // This entry is populated from configuration
        case "configured":
          /* @todo non-string values */
          entries[name] = { type: "string", value: entryConfig.source.value };
          break;
        // This entry is populated by the email from the user's credential
        case "credentialEmail":
          entries[name] = { type: "string", value: requesterEmail };
          break;
        // This entry is populated by the Semaphore ID from the user's
        // credential
        case "credentialSemaphoreID":
          entries[name] = {
            type: "cryptographic",
            value: BigInt(requesterSemaphoreId)
          };
          break;
        // This entry is populated by some value from the CSV input.
        case "input":
          const columnName = entryConfig.source.name;
          // Check if the configured column exists.
          if (!(columnName in inputRow)) {
            throw new Error(
              `Could not find column "${entryConfig.source.name}" in CSV data, required by output field ${name}`
            );
          }
          const value = inputRow[columnName];
          // Create a POD entry with the appropriate type and value.
          // This could perhaps use some more validation, possibly based on the
          // work done in PODTicketPCD on Zod validation for POD entries.
          if (entryConfig.type === "cryptographic") {
            entries[name] = {
              type: "cryptographic",
              value: BigInt(value)
            };
          } else if (entryConfig.type === "int") {
            entries[name] = {
              type: "int",
              value: BigInt(value)
            };
          } else {
            entries[name] = {
              type: "string",
              value
            };
          }
          break;
      }
    }

    const pcd = await PODPCDPackage.prove({
      entries: {
        value: entries,
        argumentType: ArgumentTypeName.Object
      },
      privateKey: {
        value: eddsaPrivateKey,
        argumentType: ArgumentTypeName.String
      },
      id: {
        value: uuidv5(Object.values(inputRow).join(","), pipelineId),
        argumentType: ArgumentTypeName.String
      }
    });

    const serialized = await PODPCDPackage.serialize(pcd);

    return serialized;
  });
}
