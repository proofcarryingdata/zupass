import {
  GenericIssuanceDeletePipelineResponse,
  GenericIssuanceUpsertPipelineResponse,
  PipelineDefinition,
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
      jwt: userJWT ?? "",
      pipeline
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
