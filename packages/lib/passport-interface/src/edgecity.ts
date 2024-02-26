import { BadgeConfig } from "./genericIssuanceTypes";

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

export const BADGES_EDGE_CITY: BadgeConfig[] = [
  {
    id: "Check In",
    eventName: "Check In",
    imageUrl: "https://i.ibb.co/QdhQkPC/wristband.webp",
    grantOnCheckin: true,
    givers: ["richard@pcd.team", "ivan@0xparc.org"]
  },

  {
    id: "Cold Plunge.Monday",
    eventName: "Cold Plunge",
    productName: "Monday",
    imageUrl: "https://i.ibb.co/kSsHTRG/saunaaaaa.webp",
    givers: ["richard@pcd.team"]
  },
  {
    id: "Cold Plunge.Tuesday",
    eventName: "Cold Plunge",
    productName: "Tuesday",
    imageUrl: "https://i.ibb.co/kSsHTRG/saunaaaaa.webp",
    givers: ["richard@pcd.team"]
  },
  {
    id: "Cold Plunge.Wednesday",
    eventName: "Cold Plunge",
    productName: "Wednesday",
    imageUrl: "https://i.ibb.co/kSsHTRG/saunaaaaa.webp",
    givers: ["richard@pcd.team"]
  },
  {
    id: "Cold Plunge.Thursday",
    eventName: "Cold Plunge",
    productName: "Thursday",
    imageUrl: "https://i.ibb.co/kSsHTRG/saunaaaaa.webp",
    givers: ["richard@pcd.team"]
  },
  {
    id: "Cold Plunge.Friday",
    eventName: "Cold Plunge",
    productName: "Friday",
    imageUrl: "https://i.ibb.co/kSsHTRG/saunaaaaa.webp",
    givers: ["richard@pcd.team"]
  },
  {
    id: "Cold Plunge.Saturday",
    eventName: "Cold Plunge",
    productName: "Saturday",
    imageUrl: "https://i.ibb.co/kSsHTRG/saunaaaaa.webp",
    givers: ["richard@pcd.team"]
  },
  {
    id: "Cold Plunge.Sunday",
    eventName: "Cold Plunge",
    productName: "Sunday",
    imageUrl: "https://i.ibb.co/kSsHTRG/saunaaaaa.webp",
    givers: ["richard@pcd.team"]
  },
  {
    id: "Met Zupass.Josh",
    eventName: "Met Zupass",
    productName: "Josh",
    imageUrl: "https://i.ibb.co/Lxz9TYp/hat.webp",
    givers: ["jgarza@0xparc.org"]
  },
  {
    id: "Met Zupass.Richard",
    eventName: "Met Zupass",
    productName: "Richard",
    imageUrl: "https://i.ibb.co/Lxz9TYp/hat.webp",
    givers: ["richard@pcd.team"]
  },
  {
    id: "Met Zupass.Ivan",
    eventName: "Met Zupass",
    productName: "Ivan",
    imageUrl: "https://i.ibb.co/Lxz9TYp/hat.webp",
    givers: ["ivan@0xparc.org"]
  },
  {
    id: "Met Zupass.Rob",
    eventName: "Met Zupass",
    productName: "Rob",
    imageUrl: "https://i.ibb.co/Lxz9TYp/hat.webp",
    givers: ["themanhimself@robknight.org.uk"]
  }
];
