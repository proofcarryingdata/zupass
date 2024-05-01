import { AutoIssuanceOptions, ManualTicket } from "@pcd/passport-interface";
import { IPipelineConsumerDB } from "../../database/queries/pipelineConsumerDB";

export class AutoIssuanceProvider {
  private pipelineId: string;
  private autoIssuanceConfig: AutoIssuanceOptions;

  public constructor(
    pipelineId: string,
    autoIssuanceConfig: AutoIssuanceOptions
  ) {
    this.pipelineId = pipelineId;
    this.autoIssuanceConfig = autoIssuanceConfig;
  }

  public async load(
    _consumerDB: IPipelineConsumerDB,
    _existingManualTickets: ManualTicket[]
  ): Promise<ManualTicket[]> {
    return [];
  }
}
