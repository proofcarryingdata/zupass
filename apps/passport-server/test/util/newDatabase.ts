import _ from "lodash";
import pgtools from "pgtools";
import { getDatabaseConfiguration } from "../../src/database/postgresConfiguration";

export async function newDatabase(): Promise<void> {
  const letters = "abcdefghijklmnopqrstuvwxyz";
  let name = "";
  for (let i = 0; i < 16; i++) {
    name += _.sample(letters);
  }

  const dbconfig = getDatabaseConfiguration();
  await pgtools.createdb(dbconfig, name);

  process.env.DATABASE_DB_NAME = name;
}
