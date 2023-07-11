import { IssuedPCDsRequest, IssuedPCDsResponse } from "@pcd/passport-interface";
import { ApplicationContext } from "../types";

export class IssuanceService {
  private readonly context: ApplicationContext;

  public constructor(context: ApplicationContext) {
    this.context = context;
  }

  public async handleRequest(
    request: IssuedPCDsRequest
  ): Promise<IssuedPCDsResponse> {
    return {
      pcds: [],
    };
  }

  private issueEmailOwnershipPCD(): Promise<void> {}
}

export function startIssuanceService(
  context: ApplicationContext
): IssuanceService {
  const issuanceService = new IssuanceService(context);
  return issuanceService;
}
