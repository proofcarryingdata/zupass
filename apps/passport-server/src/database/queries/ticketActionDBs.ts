import { ticketDisplayName } from "@pcd/eddsa-ticket-pcd";
import { Badge, BadgeConfig } from "@pcd/passport-interface";
import { PoolClient } from "postgres-pool";
import { sqlQuery } from "../sqlQuery";

export interface IBadgeGiftingDB {
  giveBadges(
    client: PoolClient,
    pipelineId: string,
    giverEmail: string,
    receiverEmail: string,
    badges: BadgeConfig[]
  ): Promise<void>;

  getBadges(
    client: PoolClient,
    pipelineId: string,
    receiverEmail: string | undefined
  ): Promise<Badge[]>;

  getGivenBadges(
    client: PoolClient,
    pipelineId: string,
    giverEmail: string,
    badgeIds: string[],
    startingAgoMs: number
  ): Promise<Badge[]>;
}

export class BadgeGiftingDB implements IBadgeGiftingDB {
  public async giveBadges(
    client: PoolClient,
    pipelineId: string,
    giverEmail: string,
    receiverEmail: string,
    badges: BadgeConfig[]
  ): Promise<void> {
    for (const badge of badges) {
      await sqlQuery(
        client,
        `
        insert into podbox_given_badges
        (pipeline_id, giver_email, receiver_email, badge_id, badge_name, badge_url)
        values ($1, $2, $3, $4, $5, $6)
`,
        [
          pipelineId,
          giverEmail,
          receiverEmail,
          badge.id,
          ticketDisplayName(badge.eventName, badge.productName),
          badge.imageUrl
        ]
      );
    }
  }

  public async getBadges(
    client: PoolClient,
    pipelineId: string,
    receiverEmail: string
  ): Promise<Badge[]> {
    const res = await sqlQuery(
      client,
      `
      select * from podbox_given_badges 
      where pipeline_id=$1 and receiver_email=$2
`,
      [pipelineId, receiverEmail]
    );

    return res.rows.map((r): Badge => {
      return {
        id: r.badge_id,
        timeCreated: r.time_created.getTime(),
        giver: r.giver_email
      };
    });
  }

  public async getGivenBadges(
    client: PoolClient,
    pipelineId: string,
    giverEmail: string,
    badgeIds: string[],
    startingAgoMs: number
  ): Promise<Badge[]> {
    const res = await sqlQuery(
      client,
      `
      select * from podbox_given_badges
      where pipeline_id=$1
        and giver_email=$2
        and badge_id = ANY($3)
        and time_created > NOW() - $4 * INTERVAL '1' second
`,
      [pipelineId, giverEmail, badgeIds, Math.floor(startingAgoMs / 1000)]
    );

    return res.rows.map((r): Badge => {
      return {
        id: r.badge_id,
        timeCreated: r.time_created.getTime(),
        giver: r.giver_email
      };
    });
  }
}

export interface IContactSharingDB {
  saveContact(
    client: PoolClient,
    pipelineId: string,
    collectorEmail: string,
    contactEmail: string
  ): Promise<void>;

  getContacts(
    client: PoolClient,
    pipelineId: string,
    collectorEmail: string | undefined
  ): Promise<string[]>;
}

export class ContactSharingDB implements IContactSharingDB {
  public async saveContact(
    client: PoolClient,
    pipelineId: string,
    collectorEmail: string,
    contactEmail: string
  ): Promise<void> {
    await sqlQuery(
      client,
      `
        insert into podbox_collected_contacts
        (pipeline_id, collector_email, contact_email)
        values ($1, $2, $3)
        on conflict(pipeline_id, collector_email, contact_email) do nothing
`,
      [pipelineId, collectorEmail, contactEmail]
    );
  }

  public async getContacts(
    client: PoolClient,
    pipelineId: string,
    colletorEmail: string
  ): Promise<string[]> {
    const res = await sqlQuery(
      client,
      `
      select * from podbox_collected_contacts 
      where pipeline_id=$1 and collector_email=$2
`,
      [pipelineId, colletorEmail]
    );

    return res.rows.map((r) => r.contact_email);
  }
}
