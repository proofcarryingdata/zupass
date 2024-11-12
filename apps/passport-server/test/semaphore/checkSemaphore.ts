import { deserializeSemaphoreGroup } from "@pcd/semaphore-group-pcd";
import { BigNumberish, Group } from "@semaphore-protocol/group";
import { expect } from "chai";
import { fetchLatestHistoricSemaphoreGroups } from "../../src/database/queries/historicSemaphore";
import { sqlQueryWithPool } from "../../src/database/sqlQuery";
import { Zupass } from "../../src/types";

export interface SemaphoreGroups {
  p: string[]; // participants
  r: string[]; // residents
  v: string[]; // visitors
  o: string[]; // organizers
  g: string[]; // generic,
  d: string[]; // devconnect attendees
  s: string[]; // devconnect superusers/organizers
}

export function expectGroupsEqual(
  lhs: SemaphoreGroups | undefined,
  rhs: SemaphoreGroups | undefined
): void {
  if (!lhs || !rhs) {
    expect(lhs).to.deep.eq(rhs);
    return;
  }

  expect(new Set(lhs.p)).to.deep.eq(new Set(rhs.p));
  expect(new Set(lhs.r)).to.deep.eq(new Set(rhs.r));
  expect(new Set(lhs.v)).to.deep.eq(new Set(rhs.v));
  expect(new Set(lhs.o)).to.deep.eq(new Set(rhs.o));
  expect(new Set(lhs.d)).to.deep.eq(new Set(rhs.d));
  expect(new Set(lhs.s)).to.deep.eq(new Set(rhs.s));
  // turned off for devconnect - lots of users = slow global group.
  // expect(new Set(...lhs.g)).to.deep.eq(new Set(...rhs.g));
}

export function expectCurrentSemaphoreToBe(
  application: Zupass,
  expected: SemaphoreGroups
): void {
  const currentSemaphore = getCurrentSemaphoreServiceGroups(application);
  expectGroupsEqual(currentSemaphore, expected);
}

export async function testLatestHistoricSemaphoreGroups(
  application: Zupass
): Promise<void> {
  const currentSemaphoreGroups = getCurrentSemaphoreServiceGroups(application);
  const latestHistoricSemaphoreGroups =
    await getLatestHistoricalSemaphoreGroups(application);

  expectGroupsEqual(latestHistoricSemaphoreGroups, currentSemaphoreGroups);
}

function nonZeroGroupMembers(group: Group | undefined): BigNumberish[] {
  if (!group) {
    return [];
  }

  return group.members.filter(
    (m) => m.toString() !== group.zeroValue.toString()
  );
}

function getCurrentSemaphoreServiceGroups(
  application: Zupass
): SemaphoreGroups | undefined {
  if (!application.services.semaphoreService) {
    return undefined;
  }

  return {
    g: nonZeroGroupMembers(
      application.services.semaphoreService?.groupEveryone()?.group
    ).map((m) => m.toString()),
    v: nonZeroGroupMembers(
      application.services.semaphoreService?.groupVisitors()?.group
    ).map((m) => m.toString()),
    o: nonZeroGroupMembers(
      application.services.semaphoreService?.groupOrganizers()?.group
    ).map((m) => m.toString()),
    p: nonZeroGroupMembers(
      application.services.semaphoreService?.groupParticipants()?.group
    ).map((m) => m.toString()),
    r: nonZeroGroupMembers(
      application.services.semaphoreService?.groupResidents()?.group
    ).map((m) => m.toString()),
    d: nonZeroGroupMembers(
      application.services.semaphoreService?.groupDevconnectAttendees()?.group
    ).map((m) => m.toString()),
    s: nonZeroGroupMembers(
      application.services.semaphoreService?.groupDevconnectOrganizers()?.group
    ).map((m) => m.toString())
  };
}

async function getLatestHistoricalSemaphoreGroups(
  application: Zupass
): Promise<SemaphoreGroups> {
  const latestGroups = await sqlQueryWithPool(
    application.context.dbPool,
    (client) => fetchLatestHistoricSemaphoreGroups(client)
  );

  const parsedLatestGroups = await Promise.all(
    latestGroups.map((g) =>
      deserializeSemaphoreGroup(JSON.parse(g.serializedGroup))
    )
  );

  return {
    p:
      nonZeroGroupMembers(
        parsedLatestGroups.find((g) => g.id.toString() === "1") as Group
      ).map((m) => m.toString()) ?? [],
    r:
      nonZeroGroupMembers(
        parsedLatestGroups.find((g) => g.id.toString() === "2") as Group
      ).map((m) => m.toString()) ?? [],
    v:
      nonZeroGroupMembers(
        parsedLatestGroups.find((g) => g.id.toString() === "3") as Group
      ).map((m) => m.toString()) ?? [],
    o:
      nonZeroGroupMembers(
        parsedLatestGroups.find((g) => g.id.toString() === "4") as Group
      ).map((m) => m.toString()) ?? [],
    g:
      nonZeroGroupMembers(
        parsedLatestGroups.find((g) => g.id.toString() === "5") as Group
      ).map((m) => m.toString()) ?? [],
    d:
      nonZeroGroupMembers(
        parsedLatestGroups.find((g) => g.id.toString() === "6") as Group
      ).map((m) => m.toString()) ?? [],
    s:
      nonZeroGroupMembers(
        parsedLatestGroups.find((g) => g.id.toString() === "7") as Group
      ).map((m) => m.toString()) ?? []
  };
}
