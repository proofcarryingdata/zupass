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

    if (issueToUnmatchedEmail !== true && !matchConfig) {
      throw new Error("No configuration for matching requests to CSV data");
    }

    if (!issueToUnmatchedEmail) {
      if (matchConfig?.type === "email") {
        const emailColumnName = matchConfig.inputField;
        if (!(emailColumnName in inputRow)) {
          throw new Error(
            `Could not find column "${emailColumnName}" in CSV input data, could not match against user email address`
          );
        }
        if (inputRow[emailColumnName] !== requesterEmail) {
          return undefined;
        }
      } else if (matchConfig?.type === "semaphoreID") {
        const semaphoreIDColumnName = matchConfig.inputField;
        if (!(semaphoreIDColumnName in inputRow)) {
          throw new Error(
            `Could not find column "${semaphoreIDColumnName}" in CSV input data, could not match against user Semaphore ID`
          );
        }
        if (inputRow[semaphoreIDColumnName] !== requesterSemaphoreId) {
          return undefined;
        }
      }
    }

    const entries: PODEntries = {};

    for (const [name, entryConfig] of Object.entries(output)) {
      switch (entryConfig.source.type) {
        case "configured":
          /* @todo non-string values */
          entries[name] = { type: "string", value: entryConfig.source.value };
          break;
        case "credentialEmail":
          entries[name] = { type: "string", value: requesterEmail };
          break;
        case "credentialSemaphoreID":
          entries[name] = {
            type: "cryptographic",
            value: BigInt(requesterSemaphoreId)
          };
          break;
        case "input":
          const columnName = entryConfig.source.name;
          if (!(columnName in inputRow)) {
            throw new Error(
              `Could not find column "${entryConfig.source.name}" in CSV data, required by output field ${name}`
            );
          }
          const value = inputRow[columnName];
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
