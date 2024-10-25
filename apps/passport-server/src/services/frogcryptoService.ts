import { Biome, IFrogData, Rarity } from "@pcd/eddsa-frog-pcd";
import {
  Credential,
  FROG_FREEROLLS,
  FROG_SCORE_CAP,
  FrogCryptoComputedUserState,
  FrogCryptoDeleteFrogsRequest,
  FrogCryptoDeleteFrogsResponseValue,
  FrogCryptoFeed,
  FrogCryptoFolderName,
  FrogCryptoFrogData,
  FrogCryptoScore,
  FrogCryptoShareTelegramHandleRequest,
  FrogCryptoShareTelegramHandleResponseValue,
  FrogCryptoUpdateFeedsRequest,
  FrogCryptoUpdateFeedsResponseValue,
  FrogCryptoUpdateFrogsRequest,
  FrogCryptoUpdateFrogsResponseValue,
  FrogCryptoUserStateRequest,
  FrogCryptoUserStateResponseValue,
  ListFeedsRequest,
  ListFeedsResponseValue,
  ListSingleFeedRequest,
  PollFeedRequest,
  PollFeedResponseValue
} from "@pcd/passport-interface";
import { PCDActionType } from "@pcd/pcd-collection";
import { RollbarService } from "@pcd/server-shared";
import _ from "lodash";
import { PoolClient } from "postgres-pool";
import { FrogCryptoUserFeedState } from "../database/models";
import {
  deleteFrogData,
  fetchUserFeedsState,
  getFrogData,
  getPossibleFrogs,
  getRawFeedData,
  getScoreboard,
  getUserScore,
  incrementScore,
  initializeUserFeedState,
  sampleFrogData,
  updateUserFeedState,
  updateUserScoreboardPreference,
  upsertFeedData,
  upsertFrogData
} from "../database/queries/frogcrypto";
import { fetchUserByV3Commitment } from "../database/queries/users";
import { namedSqlTransaction } from "../database/sqlQuery";
import { PCDHTTPError } from "../routing/pcdHttpError";
import { ApplicationContext } from "../types";
import {
  FrogCryptoFeedHost,
  parseFrogEnum,
  parseFrogTemperament,
  sampleFrogAttribute
} from "../util/frogcrypto";
import { logger } from "../util/logger";
import { IssuanceService } from "./issuanceService";

export class FrogcryptoService {
  private readonly context: ApplicationContext;
  private readonly rollbarService: RollbarService | null;
  private readonly issuanceService: IssuanceService;
  private readonly feedHost: FrogCryptoFeedHost;
  private readonly adminUsers: string[];

  public constructor(
    context: ApplicationContext,
    rollbarService: RollbarService | null,
    issuanceService: IssuanceService
  ) {
    this.context = context;
    this.rollbarService = rollbarService;
    this.issuanceService = issuanceService;
    this.feedHost = new FrogCryptoFeedHost(
      this.context.dbPool,
      (feed: FrogCryptoFeed) =>
        async (req: PollFeedRequest): Promise<PollFeedResponseValue> => {
          try {
            return namedSqlTransaction(
              this.context.dbPool,
              "pollFeed",
              async (client) => {
                if (feed.activeUntil <= Date.now() / 1000) {
                  throw new PCDHTTPError(403, "Feed is not active");
                }

                if (req.pcd === undefined) {
                  throw new PCDHTTPError(400, `Missing credential`);
                }
                await this.issuanceService.verifyCredential(req.pcd);

                return {
                  actions: [
                    {
                      pcds: await this.issuanceService.issueEdDSAFrogPCDs(
                        req.pcd,
                        await this.reserveFrogData(client, req.pcd, feed)
                      ),
                      folder: FrogCryptoFolderName,
                      type: PCDActionType.AppendToFolder
                    }
                  ]
                };
              }
            );
          } catch (e) {
            if (e instanceof PCDHTTPError) {
              throw e;
            }

            logger(`Error encountered while serving feed:`, e);
            this.rollbarService?.reportError(e);
          }
          return { actions: [] };
        }
    );
    this.adminUsers = this.getAdminUsers();
  }

  public async handleListFeedsRequest(
    request: ListFeedsRequest
  ): Promise<ListFeedsResponseValue> {
    return this.feedHost.handleListFeedsRequest(request);
  }

  public async handleListSingleFeedRequest(
    request: ListSingleFeedRequest
  ): Promise<ListFeedsResponseValue> {
    return this.feedHost.handleListSingleFeedRequest(request);
  }

  public async handleFeedRequest(
    request: PollFeedRequest
  ): Promise<PollFeedResponseValue> {
    return this.feedHost.handleFeedRequest(request);
  }

  public hasFeedWithId(feedId: string): boolean {
    return this.feedHost.hasFeedWithId(feedId);
  }

  public async getUserState(
    client: PoolClient,
    req: FrogCryptoUserStateRequest
  ): Promise<FrogCryptoUserStateResponseValue> {
    if (!("feedIds" in req)) throw new PCDHTTPError(400, "missing feedIds");
    if (!Array.isArray(req.feedIds)) {
      throw new PCDHTTPError(400, "feedIds must be an array");
    }

    const semaphoreId = await this.verifyCredentialAndGetSemaphoreId(
      client,
      req.pcd
    );

    const userFeeds = _.keyBy(
      await fetchUserFeedsState(client, semaphoreId),
      "feed_id"
    );

    const allFeeds = this.feedHost
      .getAllFeeds()
      .filter((feed) => req.feedIds.includes(feed.id));

    return {
      feeds: allFeeds.map((feed) =>
        this.computeUserFeedState(userFeeds[feed.id], feed)
      ),
      possibleFrogs: await getPossibleFrogs(client),
      myScore: await getUserScore(client, semaphoreId)
    };
  }

  public async updateTelegramHandleSharing(
    client: PoolClient,
    req: FrogCryptoShareTelegramHandleRequest
  ): Promise<FrogCryptoShareTelegramHandleResponseValue> {
    const semaphoreId = await this.verifyCredentialAndGetSemaphoreId(
      client,
      req.pcd
    );

    await updateUserScoreboardPreference(client, semaphoreId, req.reveal);

    const myScore = await getUserScore(client, semaphoreId);
    if (!myScore) {
      throw new PCDHTTPError(404, "User not found");
    }

    return {
      myScore
    };
  }

  private async reserveFrogData(
    client: PoolClient,
    credential: Credential,
    feed: FrogCryptoFeed
  ): Promise<IFrogData> {
    const semaphoreId = await this.verifyCredentialAndGetSemaphoreId(
      client,
      credential
    );

    await initializeUserFeedState(client, semaphoreId, feed.id);

    const lastFetchedAt = await updateUserFeedState(
      client,
      semaphoreId,
      feed.id
    ).catch((e) => {
      if (e.message.includes("could not obtain lock")) {
        throw new PCDHTTPError(429, "There is another frog request in flight!");
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

    const frogDataSpec = await sampleFrogData(client, feed.biomes);
    if (!frogDataSpec) {
      throw new PCDHTTPError(404, "Frog Not Found");
    }

    const frogData = this.generateFrogData(frogDataSpec, semaphoreId);

    const { score: scoreAfterRoll } = await incrementScore(
      client,
      semaphoreId,
      frogData.rarity,
      // non-frog frog doesn't get point
      frogData.biome === Biome.Unknown ? 0 : 1
    );

    if (scoreAfterRoll > FROG_SCORE_CAP) {
      throw new PCDHTTPError(403, "Frog faucet off.");
    }
    // rollback last fetched timestamp if user has free rolls left
    if (scoreAfterRoll <= FROG_FREEROLLS) {
      await updateUserFeedState(
        client,
        semaphoreId,
        feed.id,
        lastFetchedAt.toUTCString()
      );
    }

    return frogData;
  }

  /**
   * Upsert frog data into the database and return all frog data.
   */
  public async updateFrogData(
    client: PoolClient,
    req: FrogCryptoUpdateFrogsRequest
  ): Promise<FrogCryptoUpdateFrogsResponseValue> {
    await this.cachedVerifyAdminSignaturePCD(client, req.pcd);

    try {
      await upsertFrogData(client, req.frogs);
    } catch (e) {
      logger(`Error encountered while inserting frog data:`, e);
      throw new PCDHTTPError(500, `Error inserting frog data: ${e}`);
    }

    return {
      frogs: await getFrogData(client)
    };
  }

  /**
   * Delete frog data from the database and return all frog data.
   */
  public async deleteFrogData(
    client: PoolClient,
    req: FrogCryptoDeleteFrogsRequest
  ): Promise<FrogCryptoDeleteFrogsResponseValue> {
    await this.cachedVerifyAdminSignaturePCD(client, req.pcd);

    await deleteFrogData(client, req.frogIds);

    return {
      frogs: await getFrogData(client)
    };
  }

  /**
   * Return default number of top scores.
   */
  public async getScoreboard(client: PoolClient): Promise<FrogCryptoScore[]> {
    return getScoreboard(client);
  }

  /**
   * Upsert feed data into the database and return all raw feed data.
   */
  public async updateFeedData(
    client: PoolClient,
    req: FrogCryptoUpdateFeedsRequest
  ): Promise<FrogCryptoUpdateFeedsResponseValue> {
    await this.cachedVerifyAdminSignaturePCD(client, req.pcd);

    try {
      await upsertFeedData(client, req.feeds);
      // nb: refresh in-memory feed cache. As of 2023/11, we run a single
      // server. Once we scale out, servers may return stale data. See @{link
      // feedHost#refreshFeeds} on how to fix.
      await this.feedHost.refreshFeeds();
    } catch (e) {
      logger(`Error encountered while inserting frog data:`, e);
      throw new PCDHTTPError(500, `Error inserting frog data: ${e}`);
    }

    return {
      feeds: await getRawFeedData(client)
    };
  }

  public async start(): Promise<void> {
    await this.feedHost.start();
  }

  public stop(): void {
    this.feedHost.stop();
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
      nextFetchAt,
      active: feed.activeUntil > Date.now() / 1000
    };
  }

  private generateFrogData(
    frogData: FrogCryptoFrogData,
    ownerSemaphoreId: string
  ): IFrogData {
    const rarity = parseFrogEnum(Rarity, frogData.rarity);

    return {
      ..._.pick(frogData, "name", "description"),
      imageUrl: `${process.env.PASSPORT_SERVER_URL}/frogcrypto/images/${frogData.uuid}`,
      frogId: frogData.id,
      biome: parseFrogEnum(Biome, frogData.biome),
      rarity,
      temperament: parseFrogTemperament(frogData.temperament),
      jump: sampleFrogAttribute(frogData.jump_min, frogData.jump_max, rarity),
      speed: sampleFrogAttribute(
        frogData.speed_min,
        frogData.speed_max,
        rarity
      ),
      intelligence: sampleFrogAttribute(
        frogData.intelligence_min,
        frogData.intelligence_max,
        rarity
      ),
      beauty: sampleFrogAttribute(
        frogData.beauty_min,
        frogData.beauty_max,
        rarity
      ),
      timestampSigned: Date.now(),
      ownerSemaphoreId
    };
  }

  private async verifyCredentialAndGetSemaphoreId(
    client: PoolClient,
    credential: Credential
  ): Promise<string> {
    try {
      const { semaphoreId } =
        await this.issuanceService.verifyCredential(credential);
      return semaphoreId;
    } catch (e) {
      throw new PCDHTTPError(400, "invalid credential");
    }
  }

  /**
   * Verify credential against a static list of admin identities.
   */
  private async cachedVerifyAdminSignaturePCD(
    client: PoolClient,
    credential: Credential
  ): Promise<void> {
    const id = await this.verifyCredentialAndGetSemaphoreId(client, credential);
    const user = await fetchUserByV3Commitment(client, id);
    if (!user) {
      throw new PCDHTTPError(400, "invalid PCD");
    }
    if (!_.intersection(this.adminUsers, user.emails)) {
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

export async function startFrogcryptoService(
  context: ApplicationContext,
  rollbarService: RollbarService | null,
  issuanceService: IssuanceService | null
): Promise<FrogcryptoService | null> {
  if (process.env.SELF_HOSTED_PODBOX_MODE === "true") {
    logger(
      `[INIT] SELF_HOSTED_PODBOX_MODE is true - not starting semaphore service`
    );
    return null;
  }

  if (!issuanceService) {
    logger("[FROGCRYPTO] Issuance service not configured");
    return null;
  }

  const service = new FrogcryptoService(
    context,
    rollbarService,
    issuanceService
  );
  await service.start();

  return service;
}
