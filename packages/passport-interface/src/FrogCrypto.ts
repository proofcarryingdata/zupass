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
