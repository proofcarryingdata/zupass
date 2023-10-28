export interface FrogCryptoFrogData {
  id: number;
  uuid: string;
  name: string;
  description: string;
  biome: string;
  rarity: string;
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
}
