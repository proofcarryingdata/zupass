import { RollbarService } from "@pcd/server-shared";
import { Pool, PoolClient } from "postgres-pool";
import {
  CacheEntry,
  deleteExpiredCacheEntries,
  getCacheValue,
  setCacheValue
} from "../database/queries/cache";
import { namedSqlTransaction } from "../database/sqlQuery";
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

  private expirationInterval: number | undefined;
  private pool: Pool;
  private rollbarService: RollbarService | null;

  public constructor(pool: Pool, rollbarService: RollbarService | null) {
    this.pool = pool;
    this.rollbarService = rollbarService;
  }

  public start(): void {
    logger("[CACHE] starting expiration loop");

    this.tryExpireOldEntries();

    this.expirationInterval = setInterval(
      this.tryExpireOldEntries.bind(this),
      PersistentCacheService.CACHE_GARBAGE_COLLECT_INTERVAL_MS
    ) as unknown as number;
  }

  public stop(): void {
    if (this.expirationInterval) {
      clearInterval(this.expirationInterval);
    }
  }

  public async setValue(key: string, value: string): Promise<void> {
    return traced("Cache", "setValue", async (span) => {
      span?.setAttribute("cache_key", key);
      await namedSqlTransaction(this.pool, "setValue", (client) =>
        setCacheValue(client, key, value)
      );
    });
  }

  public async getValue(key: string): Promise<CacheEntry | undefined> {
    return traced("Cache", "getValue", async (span) => {
      span?.setAttribute("cache_key", key);
      return await namedSqlTransaction(this.pool, "getValue", (client) => {
        const value = getCacheValue(client, key);
        span?.setAttribute("hit", !!value);
        return value;
      });
    });
  }

  private async tryExpireOldEntries(): Promise<void> {
    return namedSqlTransaction(
      this.pool,
      "tryExpireOldEntries",
      async (client): Promise<void> => {
        try {
          return this.expireOldEntries(client);
        } catch (e) {
          logger("failed to expire old cache entries", e);
          this.rollbarService?.reportError(e);
        }
      }
    );
  }

  private async expireOldEntries(client: PoolClient): Promise<void> {
    return traced("Cache", "expireOldEntries", async (span) => {
      logger("[CACHE] expiring old entries");
      const deleted_count = await deleteExpiredCacheEntries(
        client,
        PersistentCacheService.MAX_CACHE_ENTRY_AGE_DAYS,
        PersistentCacheService.MAX_CACHE_ENTRY_COUNT
      );
      span?.setAttribute("deleted_count", deleted_count);
    });
  }
}

export function startPersistentCacheService(
  pool: Pool,
  rollbarService: RollbarService | null
): PersistentCacheService {
  logger("[INIT] starting PersistentCacheService");
  const cacheService = new PersistentCacheService(pool, rollbarService);
  cacheService.start();
  return cacheService;
}
