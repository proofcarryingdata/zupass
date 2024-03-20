import { normalizeEmail } from "@pcd/util";
import { Pool, PoolClient } from "postgres-pool";
import { v4 as uuid } from "uuid";
import { traceUser } from "../../services/generic-issuance/honeycombQueries";
import { PipelineUser } from "../../services/generic-issuance/pipelines/types";
import { traced } from "../../services/telemetryService";
import { GenericIssuanceUserRow } from "../models";
import { sqlQuery, sqlTransaction } from "../sqlQuery";

export interface IPipelineUserDB {
  loadAllUsers(): Promise<PipelineUser[]>;
  clearAllUsers(): Promise<void>;
  getUserById(userID: string): Promise<PipelineUser | undefined>;
  getUserByEmail(email: string): Promise<PipelineUser | undefined>;
  getOrCreateUser(email: string): Promise<PipelineUser>;
  updateUserById(
    user: Omit<PipelineUser, "timeCreated" | "timeUpdated">
  ): Promise<PipelineUser>;
  setUserIsAdmin(email: string, isAdmin: boolean): Promise<void>;
  getEnvAdminEmails(): string[];
}

export class PipelineUserDB implements IPipelineUserDB {
  private db: Pool;

  public constructor(db: Pool) {
    this.db = db;
  }

  public getEnvAdminEmails(): string[] {
    if (!process.env.GENERIC_ISSUANCE_ADMINS) {
      return [];
    }

    try {
      const adminEmailsFromEnv: string[] = JSON.parse(
        process.env.GENERIC_ISSUANCE_ADMINS
      );

      if (!(adminEmailsFromEnv instanceof Array)) {
        throw new Error(
          `expected environment variable 'GENERIC_ISSUANCE_ADMINS' ` +
            `to be an array of strings`
        );
      }

      return adminEmailsFromEnv;
    } catch (e) {
      return [];
    }
  }

  public async getOrCreateUser(email: string): Promise<PipelineUser> {
    return traced("PipelineUserDB", "createOrGetUser", async (span) => {
      return sqlTransaction<PipelineUser>(
        this.db,
        "createOrGetUser",
        async (client): Promise<PipelineUser> => {
          span?.setAttribute("email", email);
          const existingUser = await this.getUserByEmail(email, client);
          if (existingUser != null) {
            span?.setAttribute("is_new", false);
            traceUser(existingUser);
            return existingUser;
          }
          span?.setAttribute("is_new", true);
          const newUser = {
            id: uuid(),
            email,
            isAdmin: this.getEnvAdminEmails().includes(email)
          };
          const savedNewUser = await this.updateUserById(newUser, client);
          traceUser(savedNewUser);
          return savedNewUser;
        }
      );
    });
  }

  public async setUserIsAdmin(email: string, isAdmin: boolean): Promise<void> {
    await sqlQuery(
      this.db,
      "update generic_issuance_users set is_admin=$1 where email=$2",
      [isAdmin, normalizeEmail(email)]
    );
  }

  private dbRowToPipelineUser(row: GenericIssuanceUserRow): PipelineUser {
    return {
      id: row.id,
      email: row.email,
      isAdmin: row.is_admin,
      timeCreated: row.time_created,
      timeUpdated: row.time_updated
    };
  }

  public async loadAllUsers(): Promise<PipelineUser[]> {
    const result = await sqlQuery(
      this.db,
      "SELECT * FROM generic_issuance_users"
    );
    return result.rows.map(this.dbRowToPipelineUser);
  }

  public async clearAllUsers(): Promise<void> {
    await sqlQuery(this.db, "DELETE FROM generic_issuance_users");
  }

  public async getUserById(userID: string): Promise<PipelineUser | undefined> {
    const result = await sqlQuery(
      this.db,
      "SELECT * FROM generic_issuance_users WHERE id = $1",
      [userID]
    );
    if (result.rowCount === 0) {
      return undefined;
    } else {
      return this.dbRowToPipelineUser(result.rows[0]);
    }
  }

  public async getUserByEmail(
    email: string,
    db?: PoolClient
  ): Promise<PipelineUser | undefined> {
    const res = await sqlQuery(
      db ?? this.db,
      `select * from generic_issuance_users where email = $1`,
      [normalizeEmail(email)]
    );

    if (res.rowCount === 0) {
      return undefined;
    }

    return this.dbRowToPipelineUser(res.rows[0]);
  }

  public async updateUserById(
    user: Omit<PipelineUser, "timeCreated" | "timeUpdated">,
    db?: PoolClient
  ): Promise<PipelineUser> {
    const res = await sqlQuery(
      db ?? this.db,
      `
    INSERT INTO generic_issuance_users (id, email, is_admin) VALUES($1, $2, $3)
    ON CONFLICT(id) DO UPDATE
    SET (is_admin, time_updated) = ($3, $4)
    returning *
    `,
      [user.id, normalizeEmail(user.email), user.isAdmin, new Date()]
    );

    return this.dbRowToPipelineUser(res.rows[0]);
  }
}
