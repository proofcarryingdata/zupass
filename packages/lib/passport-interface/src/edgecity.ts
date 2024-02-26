export const EDGE_CITY_EVENT_ID = "31f76e79-09ed-59ee-aab0-befa73a56baf";
export const LEMONADE_EDDSA_PUBKEY: [string, string] = [
  "08ea870be3a405ef554d2b1ab50c496f1277e0fee0b3b2516ef405158cd44a02",
  "1d854a02e0324e02ec43703f2657eca621adc6af64043db705b743554ed8be04"
];
export const EdgeCityFolderName = "Edge City";

/**
 * User score data and computed rank
 */
export interface EdgeCityBalance {
  email_hash: string;
  balance: number;
  rank: number;
}

export const HAT_TOKEN_NAME = "ZUCASH";
export const TOTAL_SUPPLY = 200;

// TODO: Think about followers/following?
export const CONTACT_EVENT_NAME = "Contacts";

export const EVENT_NAME_TO_TOTAL_SUPPLY: Record<string, number> = {
  Zupoll: 3,
  Sauna: 14,
  Hike: 1,
  "Cold Plunge": 7,
  Ceremonies: 2,
  "Met Gary": 7,
  "Met Zupass": 7
};
