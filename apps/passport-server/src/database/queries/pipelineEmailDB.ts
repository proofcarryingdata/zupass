import { PipelineEmailType } from "@pcd/passport-interface";
import { Pool } from "postgres-pool";
import { sqlQuery } from "../sqlQuery";

export interface ISentPipelineEmail {
  pipelineId: string;
  emailType: PipelineEmailType;
  emailAddress: string;
}

export interface IPipelineEmailDB {
  recordEmailSent(
    pipelineId: string,
    emailType: PipelineEmailType,
    emailAddress: string
  ): Promise<ISentPipelineEmail | undefined>;
  getSentEmails(
    pipelineID: string,
    emailType: PipelineEmailType
  ): Promise<ISentPipelineEmail[]>;
}

/**
 * Manages the database of check-ins, currently only used for "manual tickets"
 * which are created via Pipeline configuration rather than imported from a
 * back-end system.
 */
export class PipelineEmailDB implements IPipelineEmailDB {
  private db: Pool;

  public constructor(db: Pool) {
    this.db = db;
  }
  public async recordEmailSent(
    pipelineId: string,
    emailType: PipelineEmailType,
    emailAddress: string
  ): Promise<ISentPipelineEmail | undefined> {
    const result = await sqlQuery(
      this.db,
      `insert into generic_issuance_emails (pipeline_id, email_type, email_address) values($1, $2, $3) returning *`,
      [pipelineId, emailType, emailAddress]
    );

    if (result.rows.length === 0) {
      return undefined;
    }

    return {
      emailAddress: result.rows[0].email_address,
      emailType: result.rows[0].email_type,
      pipelineId: result.rows[0].pipeline_id
    };
  }
  public async getSentEmails(
    pipelineID: string,
    emailType: PipelineEmailType
  ): Promise<ISentPipelineEmail[]> {
    const result = await sqlQuery(
      this.db,
      `select * from generic_issuance_emails where pipeline_id = $1 and email_type = $2`,
      [pipelineID, emailType]
    );

    return result.rows.map((r) => ({
      emailAddress: r.email_address,
      emailType: r.email_type,
      pipelineId: r.pipeline_id
    }));
  }
}
