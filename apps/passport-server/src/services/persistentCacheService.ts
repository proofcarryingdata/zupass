import { RollbarService } from "@pcd/server-shared";
import { Pool } from "postgres-pool";
import {
  CacheEntry,
  deleteExpiredCacheEntries,
  getCacheValue,
  setCacheValue
} from "../database/queries/cache";
import { logger } from "../util/logger";
import { traced } from "./telemetryService";

export class PersistentCacheService {
  /**
   * Entries in the cache live for a maximum of this many days.
   */
  private static readonly MAX_CACHE_ENTRY_AGE_DAYS = 7;

  /**
   * There can be a maximum of this many entries in the cache.
   */
  private static readonly MAX_CACHE_ENTRY_COUNT = 10_000;

  /**
   * Entries are aged out of the cache once every this many milliseconds.
   */
  private static readonly CACHE_GARBAGE_COLLECT_INTERVAL_MS = 60_000;

  private expirationInterval: ReturnType<typeof setInterval> | undefined;
  private db: Pool;
  private rollbarService: RollbarService | null;

  public constructor(db: Pool, rollbarService: RollbarService | null) {
    this.db = db;
    this.rollbarService = rollbarService;
  }

  public start(): void {
    logger("[CACHE] starting expiration loop");
    this.tryExpireOldEntries();
    this.expirationInterval = setInterval(
      this.tryExpireOldEntries.bind(this),
      PersistentCacheService.CACHE_GARBAGE_COLLECT_INTERVAL_MS
    );
  }

  public stop(): void {
    if (this.expirationInterval) {
      clearInterval(this.expirationInterval);
    }
  }

  public async setValue(key: string, value: string): Promise<void> {
    return traced("Cache", "setValue", async (span) => {
      span?.setAttribute("cache_key", key);
      await setCacheValue(this.db, key, value);
    });
  }

  public async getValue(key: string): Promise<CacheEntry | undefined> {
    return traced("Cache", "getValue", async (span) => {
      span?.setAttribute("cache_key", key);
      const value = getCacheValue(this.db, key);
      span?.setAttribute("hit", !!value);
      return value;
    });
  }

  private async tryExpireOldEntries(): Promise<void> {
    try {
      this.expireOldEntries();
    } catch (e) {
      logger("failed to expire old cache entries", e);
      this.rollbarService?.reportError(e);
    }
  }
  private async expireOldEntries(): Promise<void> {
    return traced("Cache", "expireOldEntries", async (span) => {
      logger("[CACHE] expiring old entries");
      const deleted_count = await deleteExpiredCacheEntries(
        this.db,
        PersistentCacheService.MAX_CACHE_ENTRY_AGE_DAYS,
        PersistentCacheService.MAX_CACHE_ENTRY_COUNT
      );
      span?.setAttribute("deleted_count", deleted_count);
    });
  }
}

export function startPersistentCacheService(
  db: Pool,
  rollbarService: RollbarService | null
): PersistentCacheService {
  logger("[INIT] starting PersistentCacheService");
  const cacheService = new PersistentCacheService(db, rollbarService);
  cacheService.start();
  return cacheService;
}
