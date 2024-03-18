import { PipelineSemaphoreGroupInfo } from "@pcd/passport-interface";
import { SerializedSemaphoreGroup } from "@pcd/semaphore-group-pcd";
import urljoin from "url-join";
import { PCDHTTPError } from "../../../routing/pcdHttpError";
import { Pipeline } from "../pipelines/types";
import { BasePipelineCapability } from "../types";
import { PipelineCapability } from "./types";

/**
 * Declares the pipeline's capability to generate Semaphore group histories.
 */
export interface SemaphoreGroupCapability extends BasePipelineCapability {
  type: PipelineCapability.SemaphoreGroup;
  // Gets the latest root for a given group ID
  getLatestGroupRoot(groupId: string): Promise<string | undefined>;
  // Gets a serialized copy of the latest group for a given ID
  getSerializedLatestGroup(
    groupId: string
  ): Promise<SerializedSemaphoreGroup | undefined>;
  // Gets a serialized copy of a group, for the history entry with a given root
  // hash
  getSerializedHistoricalGroup(
    groupId: string,
    root: string
  ): Promise<SerializedSemaphoreGroup | undefined>;
  // Gets information about the supported groups for this pipeline. Empty if
  // there are no groups.
  getSupportedGroups(): PipelineSemaphoreGroupInfo[];
}

export function isSemaphoreGroupCapability(
  capability: BasePipelineCapability
): capability is SemaphoreGroupCapability {
  return capability.type === PipelineCapability.SemaphoreGroup;
}

export function makeGenericIssuanceSemaphoreGroupUrl(
  pipelineId: string,
  groupId: string
): string {
  return urljoin(
    process.env.PASSPORT_SERVER_URL as string,
    `/generic-issuance/api/semaphore/`,
    pipelineId,
    groupId
  );
}

export function getSemaphoreGroupCapability(
  pipeline: Pipeline
): SemaphoreGroupCapability | undefined {
  return pipeline.capabilities.find((c) => isSemaphoreGroupCapability(c)) as
    | SemaphoreGroupCapability
    | undefined;
}

export function ensureSemaphoreGroupCapability(
  pipeline: Pipeline
): SemaphoreGroupCapability {
  const cap = getSemaphoreGroupCapability(pipeline);

  if (!cap) {
    throw new PCDHTTPError(
      403,
      `pipeline ${pipeline.id} does not have a Semaphore Group capability`
    );
  }

  return cap;
}
