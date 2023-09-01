import { Pool } from "postgres-pool";
import {
  CacheEntry,
  getCacheValue,
  setCacheValue
} from "../database/queries/cache";
import { traced } from "./telemetryService";

export class PersistentCacheService {
  private db: Pool;

  public constructor(db: Pool) {
    this.db = db;
  }

  public async setValue(key: string, value: string): Promise<void> {
    return traced("Cache", "setValue", (span) => {
      span?.setAttribute("cache_key", key);
      return setCacheValue(this.db, key, value);
    });
  }

  public async getValue(key: string): Promise<CacheEntry | undefined> {
    return traced("Cache", "getValue", async (span) => {
      span?.setAttribute("cache_key", key);
      const value = getCacheValue(this.db, key);
      span?.setAttribute("hit", value != null);
      return value;
    });
  }
}

export function startPersistentCacheService(db: Pool): PersistentCacheService {
  const cacheService = new PersistentCacheService(db);
  return cacheService;
}
