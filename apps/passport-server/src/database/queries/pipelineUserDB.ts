import { normalizeEmail } from "@pcd/util";
import { validate } from "email-validator";
import { PoolClient } from "postgres-pool";
import { v4 as uuid } from "uuid";
import { traceUser } from "../../services/generic-issuance/honeycombQueries";
import { PipelineUser } from "../../services/generic-issuance/pipelines/types";
import { traced } from "../../services/telemetryService";
import { GenericIssuanceUserRow } from "../models";
import { sqlQuery } from "../sqlQuery";

export interface IPipelineUserDB {
  loadAllUsers(client: PoolClient): Promise<PipelineUser[]>;
  clearAllUsers(client: PoolClient): Promise<void>;
  getUserById(
    client: PoolClient,
    userID: string
  ): Promise<PipelineUser | undefined>;
  getUserByEmail(
    client: PoolClient,
    email: string
  ): Promise<PipelineUser | undefined>;
  getOrCreateUser(client: PoolClient, email: string): Promise<PipelineUser>;
  updateUserById(
    client: PoolClient,
    user: Omit<PipelineUser, "timeCreated" | "timeUpdated">
  ): Promise<PipelineUser>;
  setUserIsAdmin(
    client: PoolClient,
    email: string,
    isAdmin: boolean
  ): Promise<void>;
  getEnvAdminEmails(client: PoolClient): string[];
}

export class PipelineUserDB implements IPipelineUserDB {
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

  public async getOrCreateUser(
    client: PoolClient,
    email: string
  ): Promise<PipelineUser> {
    return traced("PipelineUserDB", "createOrGetUser", async (span) => {
      if (!validate(email)) {
        throw new Error(`Invalid email: ${email}`);
      }

      span?.setAttribute("email", email);
      const existingUser = await this.getUserByEmail(client, email);
      if (existingUser) {
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
      const savedNewUser = await this.updateUserById(client, newUser);
      traceUser(savedNewUser);
      return savedNewUser;
    });
  }

  public async setUserIsAdmin(
    client: PoolClient,
    email: string,
    isAdmin: boolean
  ): Promise<void> {
    await sqlQuery(
      client,
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

  public async loadAllUsers(client: PoolClient): Promise<PipelineUser[]> {
    const result = await sqlQuery(
      client,
      "SELECT * FROM generic_issuance_users"
    );
    return result.rows.map(this.dbRowToPipelineUser);
  }

  public async clearAllUsers(client: PoolClient): Promise<void> {
    await sqlQuery(client, "DELETE FROM generic_issuance_users");
  }

  public async getUserById(
    client: PoolClient,
    userID: string
  ): Promise<PipelineUser | undefined> {
    const result = await sqlQuery(
      client,
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
    client: PoolClient,
    email: string
  ): Promise<PipelineUser | undefined> {
    const res = await sqlQuery(
      client,
      `select * from generic_issuance_users where email = $1`,
      [normalizeEmail(email)]
    );

    if (res.rowCount === 0) {
      return undefined;
    }

    return this.dbRowToPipelineUser(res.rows[0]);
  }

  public async updateUserById(
    client: PoolClient,
    user: Omit<PipelineUser, "timeCreated" | "timeUpdated">
  ): Promise<PipelineUser> {
    const res = await sqlQuery(
      client,
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
