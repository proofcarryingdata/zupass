import { Badge } from "@pcd/passport-interface";
import { Pool } from "postgres-pool";
import { sqlQuery } from "../sqlQuery";

export interface IBadgeGiftingDB {
  giveBadges(
    pipelineId: string,
    ticketId: string,
    badges: Badge[]
  ): Promise<void>;

  getBadges(
    pipelineId: string,
    attendeeEmail: string | undefined
  ): Promise<Badge[]>;
}

export class BadgeGiftingDB implements IBadgeGiftingDB {
  private db: Pool;

  public constructor(db: Pool) {
    this.db = db;
  }

  public async giveBadges(
    pipelineId: string,
    recipientEmail: string,
    newBadges: Badge[]
  ): Promise<void> {
    for (const newBadge of newBadges) {
      await sqlQuery(
        this.db,
        `
        insert into podbox_awarded_badges(pipeline_id, receiver_email, badge_id)
        values ($1, $2, $3)
        on conflict(pipeline_id, receiver_email, badge_id) do nothing
        `,
        [pipelineId, recipientEmail, newBadge.id]
      );
    }
  }

  public async getBadges(
    pipelineId: string,
    attendeeEmail: string
  ): Promise<Badge[]> {
    const res = await sqlQuery(
      this.db,
      `select * from podbox_awarded_badges where pipeline_id=$1 and receiver_email=$2`,
      [pipelineId, attendeeEmail]
    );

    return res.rows.map((r): Badge => {
      return {
        id: r.badge_id
      };
    });
  }
}

export interface IContact {
  email: string;
  name: string;
  timeCreated: number;
}

export interface IContactSharingDB {
  giveContact(
    pipelineId: string,
    receiverEmail: string,
    contact: IContact
  ): Promise<void>;

  getReceivedContacts(
    pipelineId: string,
    receiverEmail: string | undefined
  ): Promise<IContact[]>;
}

export class ContactSharingDB implements IContactSharingDB {
  private db: Pool;

  public constructor(db: Pool) {
    this.db = db;
  }

  public async giveContact(
    pipelineId: string,
    receiverEmail: string,
    contact: IContact
  ): Promise<void> {
    await sqlQuery(
      this.db,
      `
    insert into podbox_shared_contacts(pipeline_id, sharer_email, receiver_email)
    values ($1, $2, $3)
    on conflict(pipeline_id, sharer_email, receiver_email) do nothing`,
      [pipelineId, contact.email, receiverEmail]
    );
  }

  public async getReceivedContacts(
    pipelineId: string,
    receiverEmail: string
  ): Promise<IContact[]> {
    const res = await sqlQuery(
      this.db,
      `select * from podbox_shared_contacts where pipeline_id=$1 and receiver_email=$2`,
      [pipelineId, receiverEmail]
    );

    return res.rows.map(
      (r): IContact => ({
        email: r.sharer_email,
        name: "",
        timeCreated: r.time_created.getTime()
      })
    );
  }
}
