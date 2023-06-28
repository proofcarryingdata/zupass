import { expect } from "chai";
import { PCDPass } from "../../src/types";

export interface ExpectedSemaphoreGroups {
  p?: string[]; // participants
  r?: string[]; // residents
  v?: string[]; // visitors
  o?: string[]; // organizers
  g?: string[]; // generic
}

export function expectSemaphore(
  application: PCDPass,
  expected: ExpectedSemaphoreGroups
): void {
  const { p, r, v, o, g } = expected;

  if (p) {
    expect(p.length).to.eq(
      application.services.semaphoreService.groupParticipants().group.members
        .length
    );
    for (const u of p) {
      expect(
        application.services.semaphoreService
          .groupParticipants()
          .group.members.indexOf(u)
      ).to.be.greaterThan(-1);
    }
  }

  if (r) {
    expect(r.length).to.eq(
      application.services.semaphoreService.groupResidents().group.members
        .length
    );
    for (const u of r) {
      expect(
        application.services.semaphoreService
          .groupResidents()
          .group.members.indexOf(u)
      ).to.be.greaterThan(-1);
    }
  }

  if (v) {
    expect(v.length).to.eq(
      application.services.semaphoreService.groupVisitors().group.members.length
    );
    for (const u of v) {
      expect(
        application.services.semaphoreService
          .groupVisitors()
          .group.members.indexOf(u)
      ).to.be.greaterThan(-1);
    }
  }

  if (o) {
    expect(o.length).to.eq(
      application.services.semaphoreService.groupOrganizers().group.members
        .length
    );
    for (const u of o) {
      expect(
        application.services.semaphoreService
          .groupOrganizers()
          .group.members.indexOf(u)
      ).to.be.greaterThan(-1);
    }
  }

  if (g) {
    expect(g.length).to.eq(
      application.services.semaphoreService.groupGeneric().group.members.length
    );
    for (const u of g) {
      expect(
        application.services.semaphoreService
          .groupGeneric()
          .group.members.indexOf(u)
      ).to.be.greaterThan(-1);
    }
  }
}
