import { PollFeedResult, requestPollFeed } from "@pcd/passport-interface";
import { expectIsReplaceInFolderAction } from "@pcd/pcd-collection";
import { expect } from "chai";
import { GenericIssuanceService } from "../../src/services/generic-issuance/genericIssuanceService";
import { CSVPipeline } from "../../src/services/generic-issuance/pipelines/CSVPipeline";
import { expectLength, expectToExist, expectTrue } from "../util/util";

export async function requestCSVFeed(
  url: string,
  feedId: string
): Promise<PollFeedResult> {
  return requestPollFeed(url, { feedId, pcd: undefined });
}

export async function testCSVPipeline(
  giService: GenericIssuanceService
): Promise<void> {
  expectToExist(giService);
  const pipelines = await giService.getAllPipelines();
  expectLength(pipelines, 3);
  const csvPipeline = pipelines.find(CSVPipeline.is);
  expectToExist(csvPipeline);
  const loadRes = await csvPipeline.load();
  expectTrue(loadRes.success);
  const feedRes = await requestCSVFeed(
    csvPipeline.feedCapability.feedUrl,
    csvPipeline.feedCapability.options.feedId
  );
  expectTrue(feedRes.success);
  expectLength(feedRes.value.actions, 2);
  const pcdsAction = feedRes.value.actions[1];
  expectIsReplaceInFolderAction(pcdsAction);
  expectLength(pcdsAction.pcds, 2);
  expect(pcdsAction.folder).to.eq(
    csvPipeline.feedCapability.options.feedFolder
  );
}
