import { GenericIssuanceService } from "../../src/services/generic-issuance/genericIssuanceService";
import { CSVPipeline } from "../../src/services/generic-issuance/pipelines/CSVPipeline";
import { expectLength, expectToExist } from "../util/util";

export async function testCSVPipeline(
  giService: GenericIssuanceService
): Promise<void> {
  expectToExist(giService);
  const pipelines = await giService.getAllPipelines();
  expectLength(pipelines, 3);
  const csvPipeline = pipelines.find(CSVPipeline.is);
  expectToExist(csvPipeline);
  console.log(csvPipeline);
}
