import urljoin from "url-join";
import { ZUPASS_CLIENT_URL, ZUPASS_SERVER_URL } from "../env";
import { LoginConfig } from "../types";

export const PARC_HQ_CONFIG_ID = "0xPARC HQ";
export const PARC_HQ_CONFIG_NAME = "0xPARC HQ";
export const PARC_HQ_CONFIG_PIPELINE_ID =
  "a8e4dc18-570b-4094-808b-6e699ed08254";
export const PARC_HQ_CONFIG_SEMA_GROUP_ID =
  "4bfd3c3a-9ec5-450d-b407-7454e20d7e58";

export const PARC_HQ_CONFIG: LoginConfig = {
  configCategoryId: PARC_HQ_CONFIG_ID,
  groupId: PARC_HQ_CONFIG_SEMA_GROUP_ID,
  groupUrl: makePodboxGroupUrl(
    PARC_HQ_CONFIG_PIPELINE_ID,
    PARC_HQ_CONFIG_SEMA_GROUP_ID
  ),
  passportServerUrl: ZUPASS_SERVER_URL,
  passportAppUrl: ZUPASS_CLIENT_URL,
  name: PARC_HQ_CONFIG_NAME,
  buttonName: PARC_HQ_CONFIG_NAME
};

export function makePodboxGroupUrl(
  pipelineId: string,
  groupId: string
): string {
  return urljoin(
    "http://localhost:3002/generic-issuance/api/semaphore/",
    pipelineId,
    groupId
  );
}
