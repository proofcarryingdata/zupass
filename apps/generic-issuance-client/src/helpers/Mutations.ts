import {
  PipelineDefinition,
  ZuboxDeletePipelineResponse,
  ZuboxUpsertPipelineResponse,
  requestZuboxDeletePipeline,
  requestZuboxUpsertPipeline
} from "@pcd/passport-interface";
import { ZUPASS_SERVER_URL } from "../constants";

export const savePipeline = async (
  userJWT: string,
  pipelineString: string
): Promise<ZuboxUpsertPipelineResponse> => {
  let pipeline: PipelineDefinition;
  try {
    pipeline = JSON.parse(pipelineString);
  } catch (e) {
    throw new Error(`Invalid JSON object: ${e}`);
  }

  const saveResponse = await requestZuboxUpsertPipeline(ZUPASS_SERVER_URL, {
    jwt: userJWT,
    pipeline
  });

  return saveResponse;
};

export const deletePipeline = async (
  userJWT: string,
  pipelineID: string
): Promise<ZuboxDeletePipelineResponse> => {
  const deleteResponse = await requestZuboxDeletePipeline(
    ZUPASS_SERVER_URL,
    pipelineID,
    userJWT
  );

  return deleteResponse;
};
