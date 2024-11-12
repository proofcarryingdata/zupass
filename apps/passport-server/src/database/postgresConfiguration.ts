import { ClientConfig } from "pg";
import { PoolOptionsExplicit, SslSettings } from "postgres-pool";

export interface DBConfiguration extends ClientConfig {
  user: string;
  password: string;
  host: string;
  database: string;
  port: number;
}

export function getDatabaseConfiguration(): PoolOptionsExplicit & SslSettings {
  if (process.env.DATABASE_USERNAME === undefined) {
    throw new Error("Missing environment variable: DATABASE_USERNAME");
  }
  if (process.env.DATABASE_PASSWORD === undefined) {
    throw new Error("Missing environment variable: DATABASE_PASSWORD");
  }
  if (process.env.DATABASE_HOST === undefined) {
    throw new Error("Missing environment variable: DATABASE_HOST");
  }
  if (process.env.DATABASE_DB_NAME === undefined) {
    throw new Error("Missing environment variable: DATABASE_DB_NAME");
  }
  if (!["true", "false"].includes(process.env.DATABASE_SSL || "")) {
    throw new Error("Missing or incorrect env variable: DATABASE_SSL");
  }

  let poolSize = 32;
  if (process.env.DB_POOL_SIZE !== undefined) {
    poolSize = parseInt(process.env.DB_POOL_SIZE, 10);
    if (isNaN(poolSize)) {
      poolSize = 32;
    }
    poolSize = Math.min(Math.max(poolSize, 32), 70);
  }

  // defaults here: https://github.com/postgres-pool/postgres-pool/blob/9d623823dc365b5edea3303cab6ae519bfaa94f7/src/index.ts#L264C10-L290
  // docs here: https://github.com/postgres-pool/postgres-pool/blob/9d623823dc365b5edea3303cab6ae519bfaa94f7/src/index.ts#L29-L130
  return {
    // DB connection configuration
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    host: process.env.DATABASE_HOST,
    database: process.env.DATABASE_DB_NAME,
    port: 5432,
    ssl:
      process.env.DATABASE_SSL === "true"
        ? { rejectUnauthorized: false }
        : undefined,

    // Pool configuration
    connectionTimeoutMillis: 16_000,
    idleTimeoutMillis: 8_000,
    poolSize: poolSize, // max connection # on render is 97
    waitForAvailableConnectionTimeoutMillis: 30_000,
    databaseStartupTimeoutMillis: 30_000,
    readOnlyTransactionReconnectTimeoutMillis: 30_000,
    connectionReconnectTimeoutMillis: 30_000
  };
}
