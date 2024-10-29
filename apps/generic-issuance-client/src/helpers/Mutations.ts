import {
  GenericIssuanceClearPipelineCacheResponse,
  GenericIssuanceDeletePipelineResponse,
  GenericIssuanceUpsertPipelineResponse,
  PipelineDefinition,
  requestGenericIssuanceClearPipelineCache,
  requestGenericIssuanceDeletePipeline,
  requestGenericIssuanceUpsertPipeline
} from "@pcd/passport-interface";
import { ZUPASS_SERVER_URL } from "../constants";

export const savePipeline = async (
  userJWT: string,
  pipelineString: string
): Promise<GenericIssuanceUpsertPipelineResponse> => {
  let pipeline: PipelineDefinition;
  try {
    pipeline = JSON.parse(pipelineString);
  } catch (e) {
    throw new Error(`Invalid JSON object: ${e}`);
  }

  const saveResponse = await requestGenericIssuanceUpsertPipeline(
    ZUPASS_SERVER_URL,
    {
      jwt: userJWT,
      pipeline
    }
  );

  return saveResponse;
};

export const clearCache = async (
  userJWT: string,
  pipelineId: string
): Promise<GenericIssuanceClearPipelineCacheResponse> => {
  const saveResponse = await requestGenericIssuanceClearPipelineCache(
    ZUPASS_SERVER_URL,
    {
      jwt: userJWT,
      pipelineId
    }
  );

  return saveResponse;
};

export const deletePipeline = async (
  userJWT: string,
  pipelineID: string
): Promise<GenericIssuanceDeletePipelineResponse> => {
  const deleteResponse = await requestGenericIssuanceDeletePipeline(
    ZUPASS_SERVER_URL,
    pipelineID,
    userJWT
  );

  return deleteResponse;
};
