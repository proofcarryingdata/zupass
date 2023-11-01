import { Biome, IFrogData, Rarity } from "@pcd/eddsa-frog-pcd";
import {
  FrogCryptoComputedUserState,
  FrogCryptoDeleteFrogsRequest,
  FrogCryptoDeleteFrogsResponseValue,
  FrogCryptoUpdateFrogsRequest,
  FrogCryptoUpdateFrogsResponseValue,
  FrogCryptoUserStateRequest,
  FrogCryptoUserStateResponseValue,
  verifyFeedCredential
} from "@pcd/passport-interface";
import { FrogCryptoFrogData } from "@pcd/passport-interface/src/FrogCrypto";
import { SerializedPCD } from "@pcd/pcd-types";
import {
  SemaphoreSignaturePCD,
  SemaphoreSignaturePCDPackage
} from "@pcd/semaphore-signature-pcd";
import _ from "lodash";
import { LRUCache } from "lru-cache";
import { FrogCryptoUserFeedState } from "../database/models";
import {
  deleteFrogData,
  fetchUserFeedsState,
  getFrogData,
  getPossibleFrogCount,
  initializeUserFeedState,
  sampleFrogData,
  updateUserFeedState,
  upsertFrogData
} from "../database/queries/frogcrypto";
import { fetchUserByCommitment } from "../database/queries/users";
import { sqlTransaction } from "../database/sqlQuery";
import { PCDHTTPError } from "../routing/pcdHttpError";
import { ApplicationContext } from "../types";
import {
  FROGCRYPTO_FEEDS,
  FrogCryptoFeed,
  parseFrogEnum,
  parseFrogTemperament,
  sampleFrogAttribute
} from "../util/frogcrypto";
import { logger } from "../util/logger";
import { RollbarService } from "./rollbarService";

export class FrogcryptoService {
  private readonly context: ApplicationContext;
  private readonly rollbarService: RollbarService | null;
  private readonly verificationPromiseCache: LRUCache<string, Promise<boolean>>;
  private readonly adminUsers: string[];

  public constructor(
    context: ApplicationContext,
    rollbarService: RollbarService | null
  ) {
    this.context = context;
    this.rollbarService = rollbarService;
    this.verificationPromiseCache = new LRUCache<string, Promise<boolean>>({
      max: 1000
    });
    this.adminUsers = this.getAdminUsers();
  }

  public async getFeeds(): Promise<FrogCryptoFeed[]> {
    return FROGCRYPTO_FEEDS;
  }

  public async getUserState(
    req: FrogCryptoUserStateRequest
  ): Promise<FrogCryptoUserStateResponseValue> {
    const semaphoreId = await this.cachedVerifyPCDAndGetSemaphoreId(req.pcd);

    const userFeeds = await fetchUserFeedsState(
      this.context.dbPool,
      semaphoreId
    );

    const allFeeds = _.keyBy(await this.getFeeds(), "id");

    return {
      feeds: userFeeds.map((userFeed) =>
        this.computeUserFeedState(userFeed, allFeeds[userFeed.feed_id])
      ),
      possibleFrogCount: await getPossibleFrogCount(this.context.dbPool)
    };
  }

  public async reserveFrogData(
    pcd: SerializedPCD<SemaphoreSignaturePCD>,
    feed: FrogCryptoFeed
  ): Promise<IFrogData> {
    const semaphoreId = await this.cachedVerifyPCDAndGetSemaphoreId(pcd);

    await initializeUserFeedState(this.context.dbPool, semaphoreId, feed.id);

    return sqlTransaction(
      this.context.dbPool,
      "reserve frog",
      async (client) => {
        const lastFetchedAt = await updateUserFeedState(
          client,
          semaphoreId,
          feed.id
        ).catch((e) => {
          if (e.message.includes("could not obtain lock")) {
            throw new PCDHTTPError(
              429,
              "There is another frog request in flight!"
            );
          }
          throw e;
        });
        if (!lastFetchedAt) {
          const e = new Error("User feed state unexpectedly not found!");
          logger(`Error encountered while serving feed:`, e);
          throw e;
        }

        const { nextFetchAt } = this.computeUserFeedState(
          {
            semaphore_id: semaphoreId,
            feed_id: feed.id,
            last_fetched_at: lastFetchedAt
          },
          feed
        );
        if (nextFetchAt > Date.now()) {
          throw new PCDHTTPError(403, `Next fetch available at ${nextFetchAt}`);
        }

        const frogData = await sampleFrogData(this.context.dbPool, feed.biomes);
        if (!frogData) {
          throw new PCDHTTPError(404, "Frog Not Found");
        }

        return this.generateFrogData(frogData, semaphoreId);
      }
    );
  }

  /**
   * Upsert frog data into the database and return all frog data.
   */
  public async updateFrogData(
    req: FrogCryptoUpdateFrogsRequest
  ): Promise<FrogCryptoUpdateFrogsResponseValue> {
    await this.cachedVerifyAdminSignaturePCD(req.pcd);

    try {
      await upsertFrogData(this.context.dbPool, req.frogs);
    } catch (e) {
      logger(`Error encountered while inserting frog data:`, e);
      this.rollbarService?.reportError(e);
      throw new PCDHTTPError(500, `Error inserting frog data: ${e}`);
    }

    return {
      frogs: await getFrogData(this.context.dbPool)
    };
  }

  /**
   * Delete frog data from the database and return all frog data.
   */
  public async deleteFrogData(
    req: FrogCryptoDeleteFrogsRequest
  ): Promise<FrogCryptoDeleteFrogsResponseValue> {
    await this.cachedVerifyAdminSignaturePCD(req.pcd);

    await deleteFrogData(this.context.dbPool, req.frogIds);

    return {
      frogs: await getFrogData(this.context.dbPool)
    };
  }

  private computeUserFeedState(
    state: FrogCryptoUserFeedState | undefined,
    feed: FrogCryptoFeed
  ): FrogCryptoComputedUserState {
    const lastFetchedAt = state?.last_fetched_at?.getTime() ?? 0;
    const nextFetchAt = lastFetchedAt + feed.cooldown * 1000;

    return {
      feedId: feed.id,
      lastFetchedAt,
      nextFetchAt
    };
  }

  private generateFrogData(
    frogData: FrogCryptoFrogData,
    ownerSemaphoreId: string
  ): IFrogData {
    return {
      ..._.pick(frogData, "name", "description"),
      imageUrl: `${process.env.PASSPORT_SERVER_URL}/frogcrypto/images/${frogData.uuid}`,
      frogId: frogData.id,
      biome: parseFrogEnum(Biome, frogData.biome),
      rarity: parseFrogEnum(Rarity, frogData.rarity),
      temperament: parseFrogTemperament(frogData.temperament),
      jump: sampleFrogAttribute(frogData.jump_min, frogData.jump_max),
      speed: sampleFrogAttribute(frogData.speed_min, frogData.speed_max),
      intelligence: sampleFrogAttribute(
        frogData.intelligence_min,
        frogData.intelligence_max
      ),
      beauty: sampleFrogAttribute(frogData.beauty_min, frogData.beauty_max),
      timestampSigned: Date.now(),
      ownerSemaphoreId
    };
  }

  private async cachedVerifyPCDAndGetSemaphoreId(
    serializedPCD: SerializedPCD<SemaphoreSignaturePCD>
  ): Promise<string> {
    try {
      const { pcd } = await verifyFeedCredential(
        serializedPCD,
        this.cachedVerifySignaturePCD.bind(this)
      );
      return pcd.claim.identityCommitment;
    } catch (e) {
      throw new PCDHTTPError(400, "invalid PCD");
    }
  }

  /**
   * Returns a promised verification of a PCD, either from the cache or,
   * if there is no cache entry, from the multiprocess service.
   */
  private async cachedVerifySignaturePCD(
    serializedPCD: SerializedPCD<SemaphoreSignaturePCD>
  ): Promise<boolean> {
    const key = JSON.stringify(serializedPCD);
    const cached = this.verificationPromiseCache.get(key);
    if (cached) {
      return cached;
    } else {
      const deserialized = await SemaphoreSignaturePCDPackage.deserialize(
        serializedPCD.pcd
      );
      const promise = SemaphoreSignaturePCDPackage.verify(deserialized);
      this.verificationPromiseCache.set(key, promise);
      // If the promise rejects, delete it from the cache
      promise.catch(() => this.verificationPromiseCache.delete(key));
      return promise;
    }
  }

  /**
   * Verify signature PCD against a static list of admin identities.
   */
  private async cachedVerifyAdminSignaturePCD(
    pcd: SerializedPCD<SemaphoreSignaturePCD>
  ): Promise<void> {
    const id = await this.cachedVerifyPCDAndGetSemaphoreId(pcd);
    const user = await fetchUserByCommitment(this.context.dbPool, id);
    if (!user) {
      throw new PCDHTTPError(400, "invalid PCD");
    }
    if (!this.adminUsers.includes(user.email)) {
      throw new PCDHTTPError(403, "not authorized");
    }
  }

  private getAdminUsers(): string[] {
    try {
      const res = JSON.parse(process.env.FROGCRYPTO_ADMIN_USER_EMAILS || "[]");
      if (!Array.isArray(res) || res.some((e) => typeof e !== "string")) {
        throw new Error("admin users must be an array of strings");
      }
      if (res.length === 0) {
        logger("[FROGCRYPTO] No admin users configured");
      }
      return res;
    } catch (e) {
      logger("[FROGCRYPTO] Failed to load admin users", e);
      this.rollbarService?.reportError(e);
      return [];
    }
  }
}

export function startFrogcryptoService(
  context: ApplicationContext,
  rollbarService: RollbarService | null
): FrogcryptoService {
  const service = new FrogcryptoService(context, rollbarService);

  return service;
}
