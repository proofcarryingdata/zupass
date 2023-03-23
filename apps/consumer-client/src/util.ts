export const IS_PROD = process.env.NODE_ENV === "production";

export const PASSPORT_URL = IS_PROD
  ? "https://zupass.eth.limo/"
  : "http://localhost:3000/";
