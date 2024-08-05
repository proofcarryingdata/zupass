import { EdDSAPublicKey } from "@pcd/eddsa-pcd";
import { numberToBigInt } from "@pcd/util";
import { EdDSAFrogPCD, IFrogData, Rarity } from "./EdDSAFrogPCD.js";

/**
 * A serialized frog data is a list of big integers, where each one is a field in {@link IFrogData}. It needs to be a list of big integers so that it can be passed into {@link EdDSAPCD} to be signed.
 */
export type SerializedFrogData = [
  bigint,
  bigint,
  bigint,
  bigint,
  bigint,
  bigint,
  bigint,
  bigint,
  bigint,
  bigint,
  // These three fields are currently not typed or being used, but are kept
  // as reserved fields that are hardcoded to zero and included in the preimage
  // of the hashed signature.
  bigint,
  bigint,
  bigint
];

export function semaphoreIdToBigInt(v: string): bigint {
  return BigInt(v);
}

/**
 * Converts the property values of the {@link IFrogData} object to
 * a list of big integers ({@link SerializedTicket}).
 */
export function frogDataToBigInts(data: IFrogData): SerializedFrogData {
  return [
    numberToBigInt(data.frogId),
    numberToBigInt(data.biome),
    numberToBigInt(data.rarity),
    numberToBigInt(data.temperament),
    numberToBigInt(data.jump),
    numberToBigInt(data.speed),
    numberToBigInt(data.intelligence),
    numberToBigInt(data.beauty),
    numberToBigInt(data.timestampSigned),
    semaphoreIdToBigInt(data.ownerSemaphoreId),
    numberToBigInt(0),
    numberToBigInt(0),
    numberToBigInt(0)
  ];
}

/**
 * Returns the data inside of this PCD if it exists.
 */
export function getEdDSAFrogData(pcd?: EdDSAFrogPCD): IFrogData | undefined {
  return pcd?.claim?.data;
}

/**
 * Returns the public key this PCD was signed with if it exists.
 */
export function getPublicKey(pcd?: EdDSAFrogPCD): EdDSAPublicKey | undefined {
  return pcd?.proof?.eddsaPCD?.claim?.publicKey;
}

export function frogRarityToScore(frogRarity: Rarity): number {
  let rarityToEdgeCityScore = 1;

  switch (frogRarity) {
    case Rarity.Object:
    case Rarity.Unknown:
      rarityToEdgeCityScore *= 0;
      break;
    case Rarity.Common:
      rarityToEdgeCityScore *= 1;
      break;
    case Rarity.Rare:
      rarityToEdgeCityScore *= 4;
      break;
    case Rarity.Epic:
      rarityToEdgeCityScore *= 10;
      break;
    case Rarity.Legendary:
      rarityToEdgeCityScore *= 20;
      break;
    case Rarity.Mythic:
      rarityToEdgeCityScore *= 100;
      break;
  }

  return rarityToEdgeCityScore;
}
