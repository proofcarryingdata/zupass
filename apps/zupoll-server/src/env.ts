export const IS_PROD: boolean = process.env.NODE_ENV === "production";

export const ZUPASS_CLIENT_URL: string =
  process.env.ZUPASS_CLIENT_URL ?? "http://localhost:3000";
export const ZUPASS_SERVER_URL: string =
  process.env.ZUPASS_SERVER_URL ?? "http://localhost:3002";
export const ZUPOLL_CLIENT_URL: string =
  process.env.ZUPOLL_CLIENT_URL ?? "http://localhost:3012";
export const ZUPOLL_SERVER_URL: string =
  process.env.ZUPOLL_SERVER_URL ?? "http://localhost:3011";
export const BOT_ZUPOLL_LINK: string | undefined = process.env.BOT_ZUPOLL_LINK;

export const EDGE_CITY_PIPELINE_URL: string =
  process.env.EDGE_CITY_PIPELINE_URL ?? "";
export const EDGE_CITY_RESIDENTS_GROUP_ID: string =
  process.env.EDGE_CITY_RESIDENTS_GROUP_ID ?? "";
export const EDGE_CITY_ORGANIZERS_GROUP_ID: string =
  process.env.EDGE_CITY_ORGANIZERS_GROUP_ID ?? "";

export const ETH_LATAM_PIPELINE_URL: string =
  process.env.ETH_LATAM_PIPELINE_URL ?? "";
export const ETH_LATAM_RESIDENTS_GROUP_ID: string =
  process.env.ETH_LATAM_RESIDENTS_GROUP_ID ?? "";
export const ETH_LATAM_ORGANIZERS_GROUP_ID: string =
  process.env.ETH_LATAM_ORGANIZERS_GROUP_ID ?? "";
