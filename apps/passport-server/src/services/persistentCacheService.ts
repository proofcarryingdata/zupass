import { Pool } from "postgres-pool";
import { getCacheValue, setCacheValue } from "../database/queries/cache";

export class PersistentCacheService {
  private db: Pool;

  public constructor(db: Pool) {
    this.db = db;
  }

  public async setValue(key: string, value: string): Promise<void> {
    return setCacheValue(this.db, key, value);
  }

  public async getValue(key: string): Promise<string | undefined> {
    return getCacheValue(this.db, key);
  }
}

export function startPersistentCacheService(db: Pool): PersistentCacheService {
  const cacheService = new PersistentCacheService(db);
  return cacheService;
}
