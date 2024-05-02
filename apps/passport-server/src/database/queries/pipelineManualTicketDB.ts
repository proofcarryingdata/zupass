import { ManualTicket } from "@pcd/passport-interface";
import { QueryResultRow } from "pg";
import { Pool } from "postgres-pool";
import { sqlQuery } from "../sqlQuery";

export interface IPipelineManualTicketDB {
  save(pipelineId: string, ticket: ManualTicket): Promise<void>;
  loadByEmails(
    pipelineId: string,
    emailAddresses: string[]
  ): Promise<ManualTicket[]>;
  loadAll(pipelineId: string): Promise<ManualTicket[]>;
}

export class PipelineManualTicketDB implements IPipelineManualTicketDB {
  private db: Pool;

  public constructor(db: Pool) {
    this.db = db;
  }

  public async save(pipelineId: string, ticket: ManualTicket): Promise<void> {
    await sqlQuery(
      this.db,
      `
insert into pipeline_manual_tickets(pipeline_id, manual_ticket) values ($1, $2);
`,
      [pipelineId, ticket]
    );
  }

  public async loadByEmails(
    pipelineId: string,
    emailAddresses: string[]
  ): Promise<ManualTicket[]> {
    const res = await sqlQuery(
      this.db,
      `
select * from pipeline_manual_tickets where 
pipeline_id=$1 and 
manual_ticket->>'attendeeEmail' = ANY($2)`,
      [pipelineId, emailAddresses]
    );

    return res.rows.map(rowToManualTicket);
  }

  public async loadAll(pipelineId: string): Promise<ManualTicket[]> {
    const res = await sqlQuery(
      this.db,
      `
select * from pipeline_manual_tickets where pipeline_id=$1;
    `,
      [pipelineId]
    );

    return res.rows.map(rowToManualTicket);
  }
}

function rowToManualTicket(row: QueryResultRow): ManualTicket {
  return row.manual_ticket as ManualTicket;
}
