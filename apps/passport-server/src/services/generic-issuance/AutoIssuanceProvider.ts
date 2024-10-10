import {
  AutoIssuanceOptions,
  ManualTicket,
  MemberCriteria
} from "@pcd/passport-interface";
import { randomUUID } from "@pcd/util";
import { PoolClient } from "postgres-pool";
import { IPipelineConsumerDB } from "../../database/queries/pipelineConsumerDB";
import { logger } from "../../util/logger";
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

  public async dripNewManualTickets(
    client: PoolClient,
    consumerDB: IPipelineConsumerDB,
    existingManualTickets: ManualTicket[],
    realTickets: PretixAtom[]
  ): Promise<ManualTicket[]> {
    const allConsumers = await consumerDB.loadAll(client, this.pipelineId);
    const newManualTickets: ManualTicket[] = [];

    for (const consumer of allConsumers) {
      newManualTickets.push(
        ...(await this.maybeIssueForUser(
          consumer.email,
          existingManualTickets,
          realTickets
        ))
      );
    }

    return newManualTickets;
  }

  public async maybeIssueForUser(
    userEmail: string,
    existingManualTickets: ManualTicket[],
    realTickets: PretixAtom[]
  ): Promise<ManualTicket[]> {
    const userRealTickets = realTickets.filter((t) => t.email === userEmail);
    const userManualTickets = existingManualTickets.filter(
      (t) => t.attendeeEmail === userEmail
    );
    const newManualTickets: ManualTicket[] = [];

    for (const autoIssuance of this.autoIssuanceConfig) {
      const permissioningRealTicket = userRealTickets.find((t) =>
        ticketMatchesCriteria(t, autoIssuance.memberCriteria)
      );
      const permissioningManualTicket = userManualTickets.find((t) =>
        ticketMatchesCriteria(t, autoIssuance.memberCriteria)
      );

      const matchesIssuanceMembershipCriteria: boolean =
        !!permissioningRealTicket || !!permissioningManualTicket;

      if (!matchesIssuanceMembershipCriteria) {
        continue;
      }

      if (
        !canIssueInThisEpoch(autoIssuance, existingManualTickets, userEmail)
      ) {
        continue;
      }

      const now = new Date();
      for (let i = 0; i < autoIssuance.quantity; i++) {
        const newManualTicket: ManualTicket = {
          attendeeEmail: userEmail,
          attendeeName:
            permissioningRealTicket?.name ??
            permissioningManualTicket?.attendeeName ??
            "no name",
          eventId: autoIssuance.eventId,
          productId: autoIssuance.productId,
          id: randomUUID(),
          timeCreated: now.toISOString()
        };

        newManualTickets.push(newManualTicket);
      }
    }

    logger(
      `[AUTO_ISSUANCE] auto-issuing ${newManualTickets.length} tickets for user ${userEmail}`
    );

    return newManualTickets;
  }
}

export function anyTicketMatchesCriteria(
  ts: Array<PretixAtom | ManualTicket>,
  criterias: MemberCriteria[]
): boolean {
  return !!ts.find((t) => ticketMatchesCriteria(t, criterias));
}

export function ticketMatchesCriteria(
  t: PretixAtom | ManualTicket,
  criterias: MemberCriteria[]
): boolean {
  return !!criterias.find((c) => {
    if (t.eventId !== c.eventId) {
      return false;
    }
    if (c.productId && c.productId !== t.productId) {
      return false;
    }
    return true;
  });
}

function canIssueInThisEpoch(
  autoIssuance: AutoIssuanceOptions,
  manualTickets: ManualTicket[],
  email: string
): boolean {
  const start = new Date(autoIssuance.schedule.startDate).getTime();
  const end = new Date(
    autoIssuance.schedule.endDate ?? new Date(3000, 1, 1)
  ).getTime();
  const now = new Date().getTime();

  if (now < start || now >= end) {
    return false;
  }

  let currentEpochStart = start;
  while (now > currentEpochStart + autoIssuance.schedule.intervalMs) {
    currentEpochStart += autoIssuance.schedule.intervalMs;
  }

  const ticketsForUserInEpoch = manualTickets.filter((t) => {
    if (t.attendeeEmail !== email) {
      return false;
    }

    // only manual tickets issued by {@link AutoIssuanceProvider}
    // have a `timeCreated` field, so we filter out those that don't.
    if (!t.timeCreated) {
      return false;
    }

    // only count auto-issued tickets that match the given `autoIssuance`
    // configuration.
    if (
      t.eventId !== autoIssuance.eventId ||
      t.productId !== autoIssuance.productId
    ) {
      return false;
    }

    return new Date(t.timeCreated).getTime() >= currentEpochStart;
  });

  if (ticketsForUserInEpoch.length !== 0) {
    return false;
  }

  return true;
}
