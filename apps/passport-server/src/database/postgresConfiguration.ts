import { ClientConfig, PoolConfig } from "pg";

export interface DBConfiguration extends ClientConfig {
  user: string;
  password: string;
  host: string;
  database: string;
  port: number;
}

export function getDatabaseConfiguration(): PoolConfig {
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

  const sslMode = process.env.DATABASE_SSL === "true" ? "require" : "disable";

  return {
    // DB connection configuration
    connectionString: `postgresql://${process.env.DATABASE_USERNAME}:${process.env.DATABASE_PASSWORD}@${process.env.DATABASE_HOST}:5432/${process.env.DATABASE_DB_NAME}?sslmode=${sslMode}`,
    // Pool configuration
    connectionTimeoutMillis: 1_000,
    idleTimeoutMillis: 0,
    max: 8,
  };
}
