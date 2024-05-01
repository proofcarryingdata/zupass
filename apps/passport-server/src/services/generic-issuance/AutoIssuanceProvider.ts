import { AutoIssuanceOptions, ManualTicket } from "@pcd/passport-interface";
import { randomUUID } from "@pcd/util";
import { IPipelineConsumerDB } from "../../database/queries/pipelineConsumerDB";
import { PretixAtom } from "./pipelines/PretixPipeline";

export class AutoIssuanceProvider {
  private pipelineId: string;
  private autoIssuanceConfig: AutoIssuanceOptions[];

  public constructor(
    pipelineId: string,
    autoIssuanceConfig: AutoIssuanceOptions[]
  ) {
    this.pipelineId = pipelineId;
    this.autoIssuanceConfig = autoIssuanceConfig;
  }

  public async load(
    consumerDB: IPipelineConsumerDB,
    existingManualTickets: ManualTicket[],
    realTickets: PretixAtom[]
  ): Promise<ManualTicket[]> {
    const allConsumers = await consumerDB.loadAll(this.pipelineId);

    for (const consumer of allConsumers) {
      await this.maybeIssueForUser(
        consumer.email,
        existingManualTickets,
        realTickets
      );
    }

    return [];
  }

  public async maybeIssueForUser(
    userEmail: string,
    _existingManualTickets: ManualTicket[],
    realTickets: PretixAtom[]
  ): Promise<ManualTicket[]> {
    const userRealTickets = realTickets.filter((t) => t.email === userEmail);
    const userManualTickets = realTickets.filter((t) => t.email === userEmail);
    const newManualTickets: ManualTicket[] = [];

    for (const autoIssuance of this.autoIssuanceConfig) {
      const matchingRealTicket = userRealTickets.find((t) => {
        if (t.eventId !== autoIssuance.eventId) {
          return false;
        }
        if (autoIssuance.productId && autoIssuance.productId !== t.productId) {
          return false;
        }
        return true;
      });

      const matchingManualTicket = userManualTickets.find((t) => {
        if (t.eventId !== autoIssuance.eventId) {
          return false;
        }
        if (autoIssuance.productId && autoIssuance.productId !== t.productId) {
          return false;
        }
        return true;
      });

      const matchesIssuanceMembershipCriteria: boolean =
        !!matchingRealTicket || !!matchingManualTicket;
      if (!matchesIssuanceMembershipCriteria) {
        continue;
      }

      const newManualTicket: ManualTicket = {
        attendeeEmail: userEmail,
        attendeeName:
          matchingRealTicket?.name ?? matchingManualTicket?.name ?? "no name",
        eventId: autoIssuance.eventId,
        productId: autoIssuance.productId,
        id: randomUUID(),
        timeCreated: new Date().toISOString()
      };

      newManualTickets.push(newManualTicket);
    }

    return newManualTickets;
  }
}
