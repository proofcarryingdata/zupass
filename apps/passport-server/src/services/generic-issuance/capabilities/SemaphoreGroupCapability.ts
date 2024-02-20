import { SerializedSemaphoreGroup } from "@pcd/semaphore-group-pcd";
import urljoin from "url-join";
import { PCDHTTPError } from "../../../routing/pcdHttpError";
import { Pipeline } from "../pipelines/types";
import { BasePipelineCapability } from "../types";
import { PipelineCapability } from "./types";

/**
 * Describes the Semaphore groups supported by the pipeline.
 */
export interface PipelineSemaphoreGroups {
  groups: { name: string; groupId: string; memberCount: number; url: string }[];
}

export interface SemaphoreGroupCapability extends BasePipelineCapability {
  type: PipelineCapability.SemaphoreGroup;
  getGroupRoot(groupId: string): Promise<string | undefined>;
  getSerializedGroup(
    groupId: string
  ): Promise<SerializedSemaphoreGroup | undefined>;
  getSerializedHistoricalGroup(
    groupId: string,
    root: string
  ): Promise<SerializedSemaphoreGroup | undefined>;
  getSupportedGroups(): PipelineSemaphoreGroups;
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
