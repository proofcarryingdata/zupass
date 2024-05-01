import { AutoIssuanceOptions } from "@pcd/passport-interface";

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
}
