import { ClientConfig, PoolConfig } from "pg";

export interface DBConfiguration extends ClientConfig {
  user: string;
  password: string;
  host: string;
  database: string;
  port: number;
}

export function getDatabaseConfiguration(): PoolConfig {
  if (process.env.CONFESSION_DATABASE_USERNAME === undefined) {
    throw new Error("Missing environment variable: DATABASE_USERNAME");
  }
  if (process.env.CONFESSION_DATABASE_PASSWORD === undefined) {
    throw new Error("Missing environment variable: DATABASE_PASSWORD");
  }
  if (process.env.CONFESSION_DATABASE_HOST === undefined) {
    throw new Error("Missing environment variable: DATABASE_HOST");
  }
  if (process.env.CONFESSION_DATABASE_DB_NAME === undefined) {
    throw new Error("Missing environment variable: DATABASE_DB_NAME");
  }
  if (!["true", "false"].includes(process.env.CONFESSION_DATABASE_SSL || "")) {
    throw new Error("Missing or incorrect env variable: DATABASE_SSL");
  }

  return {
    // DB connection configuration
    user: process.env.CONFESSION_DATABASE_USERNAME,
    password: process.env.CONFESSION_DATABASE_PASSWORD,
    host: process.env.CONFESSION_DATABASE_HOST,
    database: process.env.CONFESSION_DATABASE_DB_NAME,
    port: 5432,
    ssl: process.env.CONFESSION_DATABASE_SSL === "true",

    // Pool configuration
    connectionTimeoutMillis: 1_000,
    idleTimeoutMillis: 10_000,
    max: 8,
  };
}
