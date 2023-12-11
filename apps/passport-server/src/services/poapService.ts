import { SerializedPCD } from "@pcd/pcd-types";
import { ZKEdDSAEventTicketPCDPackage } from "@pcd/zk-eddsa-event-ticket-pcd";
import { ApplicationContext } from "../types";
import { logger } from "../util/logger";

export class PoapService {
  private readonly context: ApplicationContext;

  public constructor(context: ApplicationContext) {
    this.context = context;
  }

  public async getPoapClaimUrl(serializedPCD: string): Promise<string> {
    const parsed = JSON.parse(serializedPCD) as SerializedPCD;
    if (parsed.type !== ZKEdDSAEventTicketPCDPackage.name) {
      throw new Error("proof must be ZKEdDSAEventTicketPCD type");
    }
    const pcd = await ZKEdDSAEventTicketPCDPackage.deserialize(parsed.pcd);
    // FIXME: Just have this placeholder for now - need to actually fetch from DB
    return "http://POAP.xyz/claim/n31by7";
  }

  public async stop(): Promise<void> {}
}

export async function startPoapService(
  context: ApplicationContext
): Promise<PoapService | null> {
  logger(`[INIT] initializing POAP`);

  return new PoapService(context);
}
