import { Rarity } from "@pcd/eddsa-frog-pcd";
import {
  DexFrog,
  FrogCryptoDbFeedData,
  FrogCryptoFrogData
} from "@pcd/passport-interface";
import { v4 as uuid } from "uuid";
import { parseFrogEnum } from "../../src/util/frogcrypto";

export const testFrogs: FrogCryptoFrogData[] = [
  {
    id: 1,
    uuid: uuid(),
    name: "Frog 1",
    description: "A frog",
    biome: "Jungle",
    rarity: "common",
    temperament: undefined,
    drop_weight: 1,
    jump_min: 1,
    jump_max: 1,
    speed_min: 1,
    speed_max: 1,
    intelligence_min: 1,
    intelligence_max: 1,
    beauty_min: 1,
    beauty_max: 1
  },
  {
    id: 2,
    uuid: uuid(),
    name: "Frog 2",
    description: "A frog",
    biome: "Desert",
    rarity: "common",
    temperament: undefined,
    drop_weight: 1,
    jump_min: 1,
    jump_max: 1,
    speed_min: 1,
    speed_max: 1,
    intelligence_min: 1,
    intelligence_max: 1,
    beauty_min: 1,
    beauty_max: 1
  },
  {
    id: 3,
    uuid: uuid(),
    name: "Frog 3",
    description: "A frog",
    biome: "Jungle",
    rarity: "common",
    temperament: undefined,
    drop_weight: 1,
    jump_min: 1,
    jump_max: 1,
    speed_min: 1,
    speed_max: 1,
    intelligence_min: 1,
    intelligence_max: 1,
    beauty_min: 1,
    beauty_max: 1
  },
  {
    id: 4,
    uuid: uuid(),
    name: "Frog 4",
    description: "A frog",
    biome: "Desert",
    rarity: "rare",
    temperament: "MEOW",
    drop_weight: 1,
    jump_min: 1,
    jump_max: 1,
    speed_min: 1,
    speed_max: 1,
    intelligence_min: 1,
    intelligence_max: 1,
    beauty_min: 1,
    beauty_max: 1
  },
  {
    id: 5,
    uuid: uuid(),
    name: "Frog 5",
    description: "A frog",
    biome: "The Capital",
    rarity: "rare",
    temperament: "MEOW",
    drop_weight: 1,
    jump_min: 1,
    jump_max: 1,
    speed_min: 1,
    speed_max: 1,
    intelligence_min: 0,
    intelligence_max: 0,
    beauty_min: undefined,
    beauty_max: undefined
  }
];

export const testDexFrogs: DexFrog[] = testFrogs.map((frog) => ({
  id: frog.id,
  rarity: parseFrogEnum(Rarity, frog.rarity)
}));

export const testFrogsAndObjects: FrogCryptoFrogData[] = [
  {
    id: 6,
    uuid: uuid(),
    name: "Object 1",
    description: "A object",
    biome: "Unknown",
    rarity: "object",
    temperament: undefined,
    drop_weight: 1,
    jump_min: 1,
    jump_max: 1,
    speed_min: 1,
    speed_max: 1,
    intelligence_min: 1,
    intelligence_max: 1,
    beauty_min: 1,
    beauty_max: 1
  },
  {
    id: 7,
    uuid: uuid(),
    name: "Object 2",
    description: "A object",
    biome: "Unknown",
    rarity: "object",
    temperament: undefined,
    drop_weight: 1,
    jump_min: 1,
    jump_max: 1,
    speed_min: 1,
    speed_max: 1,
    intelligence_min: 1,
    intelligence_max: 1,
    beauty_min: 1,
    beauty_max: 1
  },
  {
    id: 8,
    uuid: uuid(),
    name: "Frog 7",
    description: "A frog",
    biome: "Jungle",
    rarity: "common",
    temperament: undefined,
    drop_weight: 1,
    jump_min: 1,
    jump_max: 1,
    speed_min: 1,
    speed_max: 1,
    intelligence_min: 1,
    intelligence_max: 1,
    beauty_min: 1,
    beauty_max: 1
  },
  {
    id: 9,
    uuid: uuid(),
    name: "Frog 8",
    description: "A frog",
    biome: "Desert",
    rarity: "rare",
    temperament: "MEOW",
    drop_weight: 1,
    jump_min: 1,
    jump_max: 1,
    speed_min: 1,
    speed_max: 1,
    intelligence_min: 1,
    intelligence_max: 1,
    beauty_min: 1,
    beauty_max: 1
  }
];

export const testDexFrogsAndObjects: DexFrog[] = testFrogsAndObjects.map(
  (frog) => ({
    id: frog.id,
    rarity: parseFrogEnum(Rarity, frog.rarity)
  })
);

export const testFeeds: FrogCryptoDbFeedData[] = [
  {
    uuid: "85b139fa-3665-4b96-a7bd-77c6c4ed18cd",
    feed: {
      name: "Bog",
      description: "Bog",
      private: false,
      activeUntil: Date.now() / 1000 + 3600, // 1 hour from now
      cooldown: 60,
      biomes: {
        Jungle: { dropWeightScaler: 1 },
        Swamp: { dropWeightScaler: 1 },
        Unknown: { dropWeightScaler: 1 }
      }
    }
  },
  {
    uuid: "9e827420-79c4-4a84-b8d3-65cecdf495bc",
    feed: {
      name: "Cog",
      description: "Cog",
      private: true,
      activeUntil: Date.now() / 1000 + 3600, // 1 hour from now
      cooldown: 180,
      biomes: {
        Jungle: { dropWeightScaler: 1 },
        Swamp: { dropWeightScaler: 1 },
        Unknown: { dropWeightScaler: 1 }
      }
    }
  },
  {
    uuid: "4fdb8af9-5334-4037-a176-cef05158ef66",
    feed: {
      name: "Dog",
      description: "Dog",
      private: true,
      activeUntil: Date.now() / 1000, // expired
      cooldown: 60,
      biomes: {
        Jungle: { dropWeightScaler: 1 },
        Swamp: { dropWeightScaler: 1 },
        Unknown: { dropWeightScaler: 1 }
      }
    }
  },
  {
    uuid: "ca2e9b76-2337-4eb6-8b08-40191bb5017d",
    feed: {
      name: "God",
      description: "God",
      private: true,
      activeUntil: Date.now() / 1000 + 3600, // 1 hour from now
      cooldown: 600,
      biomes: {
        TheWrithingVoid: { dropWeightScaler: 1 }
      }
    }
  },
  {
    uuid: "4991c5ca-1622-4eb7-8657-e90843487557",
    feed: {
      name: "Cat",
      description: "Cat",
      private: true,
      activeUntil: Date.now() / 1000 + 3600, // 1 hour from now
      cooldown: 600,
      biomes: {
        TheCapital: { dropWeightScaler: 1 }
      }
    }
  },
  {
    uuid: "2e65575e-87b8-4777-a770-22ced16ecba8",
    feed: {
      name: "Bat",
      description: "Bat",
      private: true,
      activeUntil: Date.now() / 1000 + 3600, // 1 hour from now
      cooldown: 600,
      biomes: {
        Unknown: { dropWeightScaler: 1 }
      },
      codes: ["imbatman", "imbatman2"]
    }
  }
];
