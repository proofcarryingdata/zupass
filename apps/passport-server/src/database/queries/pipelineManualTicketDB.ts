import { ManualTicket } from "@pcd/passport-interface";
import { QueryResultRow } from "pg";
import { PoolClient } from "postgres-pool";
import { sqlQuery } from "../sqlQuery";

export interface IPipelineManualTicketDB {
  save(
    client: PoolClient,
    pipelineId: string,
    ticket: ManualTicket
  ): Promise<void>;
  loadByEmails(
    client: PoolClient,
    pipelineId: string,
    emailAddresses: string[]
  ): Promise<ManualTicket[]>;
  loadAll(client: PoolClient, pipelineId: string): Promise<ManualTicket[]>;
}

export class PipelineManualTicketDB implements IPipelineManualTicketDB {
  public async save(
    client: PoolClient,
    pipelineId: string,
    ticket: ManualTicket
  ): Promise<void> {
    await sqlQuery(
      client,
      `
insert into pipeline_manual_tickets(pipeline_id, manual_ticket) values ($1, $2);
`,
      [pipelineId, ticket]
    );
  }

  public async loadByEmails(
    client: PoolClient,
    pipelineId: string,
    emailAddresses: string[]
  ): Promise<ManualTicket[]> {
    const res = await sqlQuery(
      client,
      `
select * from pipeline_manual_tickets where 
pipeline_id=$1 and 
manual_ticket->>'attendeeEmail' = ANY($2)`,
      [pipelineId, emailAddresses]
    );

    return res.rows.map(rowToManualTicket);
  }

  public async loadAll(
    client: PoolClient,
    pipelineId: string
  ): Promise<ManualTicket[]> {
    const res = await sqlQuery(
      client,
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
