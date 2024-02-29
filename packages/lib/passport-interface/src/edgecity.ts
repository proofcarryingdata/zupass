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

export const TOKEN_LONG_NAME = "ZUCASH";
export const TOTAL_SUPPLY = 200;

// TODO: Think about followers/following?
export const CONTACT_EVENT_NAME = "Contacts";

export interface BadgeConfigUI extends BadgeConfig {
  hiddenWhenEmpty?: boolean; // defines whether this badge is hidden in the UI when no badges of this ID been collected
}

export const BADGES_EDGE_CITY: BadgeConfigUI[] = [
  {
    id: "Check In",
    eventName: "Check In",
    imageUrl: "/images/wristband.webp",
    grantOnCheckin: true,
    givers: ["richard@pcd.team", "ivan@0xparc.org"]
  },
  {
    id: "Cold Plunge.Tuesday",
    eventName: "Cold Plunge",
    productName: "Tuesday",
    imageUrl: "/images/cold.webp",
    givers: ["richard@pcd.team"]
  },
  {
    id: "Cold Plunge.Wednesday",
    eventName: "Cold Plunge",
    productName: "Wednesday",
    imageUrl: "/images/cold.webp",
    givers: ["richard@pcd.team"]
  },
  {
    id: "Cold Plunge.Thursday",
    eventName: "Cold Plunge",
    productName: "Thursday",
    imageUrl: "/images/cold.webp",
    givers: ["richard@pcd.team"]
  },
  {
    id: "Cold Plunge.Friday",
    eventName: "Cold Plunge",
    productName: "Friday",
    imageUrl: "/images/cold.webp",
    givers: ["richard@pcd.team"]
  },
  {
    id: "Cold Plunge.Saturday",
    eventName: "Cold Plunge",
    productName: "Saturday",
    imageUrl: "/images/cold.webp",
    givers: ["richard@pcd.team"]
  },
  {
    id: "Cold Plunge.Sunday",
    eventName: "Cold Plunge",
    productName: "Sunday",
    imageUrl: "/images/cold.webp",
    givers: ["richard@pcd.team"]
  },
  {
    id: "Sauna.Tuesday",
    eventName: "Sauna",
    productName: "Tuesday",
    imageUrl: "/images/sauna.webp",
    givers: ["richard@pcd.team"]
  },
  {
    id: "Sauna.Wednesday",
    eventName: "Sauna",
    productName: "Wednesday",
    imageUrl: "/images/sauna.webp",
    givers: ["richard@pcd.team"]
  },
  {
    id: "Sauna.Thursday",
    eventName: "Sauna",
    productName: "Thursday",
    imageUrl: "/images/sauna.webp",
    givers: ["richard@pcd.team"]
  },
  {
    id: "Sauna.Friday",
    eventName: "Sauna",
    productName: "Friday",
    imageUrl: "/images/sauna.webp",
    givers: ["richard@pcd.team"]
  },
  {
    id: "Sauna.Saturday",
    eventName: "Sauna",
    productName: "Saturday",
    imageUrl: "/images/sauna.webp",
    givers: ["richard@pcd.team"]
  },
  {
    id: "Sauna.Sunday",
    eventName: "Sauna",
    productName: "Sunday",
    imageUrl: "/images/sauna.webp",
    givers: ["richard@pcd.team"]
  },
  {
    id: "Met Zupass.Josh",
    eventName: "Met Zupass",
    productName: "Josh",
    imageUrl: "/images/hat.webp",
    givers: ["jgarza@0xparc.org"]
  },
  {
    id: "Met Zupass.Richard",
    eventName: "Met Zupass",
    productName: "Richard",
    imageUrl: "/images/hat.webp",
    givers: ["richard@pcd.team"]
  },
  {
    id: "Met Zupass.Ivan",
    eventName: "Met Zupass",
    productName: "Ivan",
    imageUrl: "/images/hat.webp",
    givers: ["ivan@0xparc.org"]
  },
  {
    id: "Met Zupass.Rob",
    eventName: "Met Zupass",
    productName: "Rob",
    imageUrl: "/images/hat.webp",
    givers: ["themanhimself@robknight.org.uk"]
  },
  {
    id: "Met Gary.Monday",
    eventName: "Met Gary",
    productName: "Monday",
    imageUrl: "/images/johnwick.webp",
    givers: ["garysheng11@gmail.com"]
  },
  {
    id: "Met Timour",
    eventName: "Met Timour",
    productName: "",
    imageUrl: "/images/owl.webp",
    givers: ["timour.kosters@gmail.com"]
  },
  {
    id: "Decentralized Social Hacker",
    eventName: "Decentralized Social Hacker",
    productName: "",
    imageUrl: "/images/social.webp",
    hiddenWhenEmpty: true,
    givers: ["abishek@zerion.io", "afrazhaowang@gmail.com"]
  }
];
