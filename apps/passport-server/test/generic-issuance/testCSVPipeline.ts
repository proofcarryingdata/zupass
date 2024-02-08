import { GenericIssuanceService } from "../../src/services/generic-issuance/genericIssuanceService";
import { LemonadePipeline } from "../../src/services/generic-issuance/pipelines/LemonadePipeline";
import { expectLength, expectToExist } from "../util/util";

export async function testCSVPipeline(
  giService: GenericIssuanceService
): Promise<void> {
  expectToExist(giService);
  const pipelines = await giService.getAllPipelines();
  expectLength(pipelines, 2);
  const edgeCityDenverPipeline = pipelines.find(LemonadePipeline.is);
  expectToExist(edgeCityDenverPipeline);
}
