import { Biome, EdDSAFrogPCDPackage } from "@pcd/eddsa-frog-pcd";

import { Feed } from "./SubscriptionManager";

/**
 * Map of configs for Biome(s) where PCDs can be issued from this feed
 */
export type FrogCryptoFeedBiomeConfigs = Partial<
  Record<
    keyof typeof Biome,
    {
      /**
       * A scaling factor that is multiplied to the weight of the frog to affect
       * the probability of the frog being issued
       */
      dropWeightScaler: number;
    }
  >
>;

/**
 * FrogCrypto specific feed configurations
 *
 * Note: It is important to ensure that the feed cannot be discovered by guessing the {@link Feed#id}
 */
export interface FrogCryptoFeed extends Feed<typeof EdDSAFrogPCDPackage> {
  /**
   * Whether this feed is discoverable in GET /feeds
   *
   * A feed can still be queried as GET /feeds/:feedId or polled as POST /feeds even if it is not discoverable
   * as long as the user knows the feed ID.
   * @default false
   */
  private: boolean;
  /**
   * Unix timestamp in seconds of when this feed will become inactive
   *
   * PCD can only be issued from this feed if it is active
   * @default 0 means the feed is inactive
   */
  activeUntil: number;
  /**
   * How long to wait between each PCD issuance in seconds
   */
  cooldown: number;
  /**
   * Map of configs for Biome(s) where PCDs can be issued from this feed
   */
  biomes: FrogCryptoFeedBiomeConfigs;
}

/**
 * DB schema for feed data
 */
export type FrogCryptoDbFeedData = {
  uuid: string;
  feed: Omit<
    FrogCryptoFeed,
    | "id"
    | "autoPoll"
    | "inputPCDType"
    | "partialArgs"
    | "credentialRequest"
    | "permissions"
    | "active"
  >;
};

/**
 * Validate is a value is a {@link FrogCryptoDbFeedData}
 */
export function isFrogCryptoDbFeedData(
  value: Record<string, unknown>
): value is FrogCryptoDbFeedData {
  if (
    typeof value !== "object" ||
    value === null ||
    !("uuid" in value && typeof value.uuid === "string")
  ) {
    return false;
  }

  const feed = value.feed;
  if (!feed || typeof feed !== "object") {
    return false;
  }

  if (!("biomes" in feed)) {
    return false;
  }
  const biomes = feed.biomes;
  if (!biomes || typeof biomes !== "object") {
    return false;
  }

  return (
    "private" in feed &&
    typeof feed.private === "boolean" &&
    "activeUntil" in feed &&
    typeof feed.activeUntil === "number" &&
    Number.isInteger(feed.activeUntil) &&
    "cooldown" in feed &&
    typeof feed.cooldown === "number" &&
    Number.isInteger(feed.cooldown) &&
    Object.values(biomes).every(
      (biomeConfig) =>
        typeof biomeConfig === "object" &&
        biomeConfig !== null &&
        "dropWeightScaler" in biomeConfig &&
        typeof biomeConfig.dropWeightScaler === "number" &&
        Number.isFinite(biomeConfig.dropWeightScaler)
    )
  );
}

/**
 * The prototype specification for frog creation
 *
 * This represents the raw specification of a frog, which is then used to generate the {@link IFrogData} in the {@link EdDSAFrogPCD}. Some attributes are optional and will be randomly selected if not specified.
 * This mirrors the specification from the design spreadsheet and is wrapped as {@link FrogCryptoDbFrogData} to store in the database.
 * See {@link FrogCryptoFeed} for the feed configuration and how Frog prototypes are selected.
 *
 * Undefined numeric attribute means that the value will be randomly selected from [0, 10].
 */
export type FrogCryptoFrogData = {
  id: number;
  uuid: string;
  name: string;
  description: string;
  biome: string;
  rarity: string;
  /**
   * undefined means the temperament will be randomly selected
   */
  temperament: string | undefined;
  drop_weight: number;
  jump_min: number | undefined;
  jump_max: number | undefined;
  speed_min: number | undefined;
  speed_max: number | undefined;
  intelligence_min: number | undefined;
  intelligence_max: number | undefined;
  beauty_min: number | undefined;
  beauty_max: number | undefined;
};

/**
 * Validate is a value is a {@link FrogCryptoFrogData}
 */
export function isFrogCryptoFrogData(
  value: Record<string, unknown>
): value is FrogCryptoFrogData {
  return (
    typeof value === "object" &&
    "id" in value &&
    typeof value.id === "number" &&
    Number.isSafeInteger(value.id) &&
    "uuid" in value &&
    typeof value.uuid === "string" &&
    "name" in value &&
    typeof value.name === "string" &&
    "description" in value &&
    typeof value.description === "string" &&
    "biome" in value &&
    typeof value.biome === "string" &&
    "rarity" in value &&
    typeof value.rarity === "string" &&
    "temperament" in value &&
    (typeof value.temperament === "string" ||
      typeof value.temperament === "undefined") &&
    "drop_weight" in value &&
    typeof value.drop_weight === "number" &&
    Number.isFinite(value.drop_weight) &&
    "jump_min" in value &&
    ((typeof value.jump_min === "number" && Number.isInteger(value.jump_min)) ||
      typeof value.jump_min === "undefined") &&
    "jump_max" in value &&
    ((typeof value.jump_max === "number" && Number.isInteger(value.jump_max)) ||
      typeof value.jump_max === "undefined") &&
    "speed_min" in value &&
    ((typeof value.speed_min === "number" &&
      Number.isInteger(value.speed_min)) ||
      typeof value.speed_min === "undefined") &&
    "speed_max" in value &&
    ((typeof value.speed_max === "number" &&
      Number.isInteger(value.speed_max)) ||
      typeof value.speed_max === "undefined") &&
    "intelligence_min" in value &&
    ((typeof value.intelligence_min === "number" &&
      Number.isInteger(value.intelligence_min)) ||
      typeof value.intelligence_min === "undefined") &&
    "intelligence_max" in value &&
    ((typeof value.intelligence_max === "number" &&
      Number.isInteger(value.intelligence_max)) ||
      typeof value.intelligence_max === "undefined") &&
    "beauty_min" in value &&
    ((typeof value.beauty_min === "number" &&
      Number.isInteger(value.beauty_min)) ||
      typeof value.beauty_min === "undefined") &&
    "beauty_max" in value &&
    ((typeof value.beauty_max === "number" &&
      Number.isInteger(value.beauty_max)) ||
      typeof value.beauty_max === "undefined")
  );
}

/**
 * DB schema for frog data
 */
export interface FrogCryptoDbFrogData {
  id: number;
  uuid: string;
  frog: Omit<FrogCryptoFrogData, "id" | "uuid">;
}

/**
 * All FrogCrypto PCDs are stored in a folder named "FrogCrypto".
 */
export const FrogCryptoFolderName = "FrogCrypto";

/**
 * User score data and computed rank
 */
export interface FrogCryptoScore {
  semaphore_id: string;
  score: number;
  rank: number;
}
