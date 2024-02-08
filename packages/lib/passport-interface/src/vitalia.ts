import { EdDSAPublicKey } from "@pcd/eddsa-pcd";

// IDs copied from https://github.com/robknight/zuconnect-badges/blob/19b05e67c3d82dcf066a5e211ca233ca30068dfb/src/pages/api/generate-badge.ts#L11-L12.
export const VITALIA_EVENT_ID = "9ccc53cb-3b0a-415b-ab0d-76cfa21c72ac";
export const VITALIA_ATTENDEE_PRODUCT_ID =
  "cd3f2b06-e520-4eff-b9ed-c52365c60848";
export const VITALIA_PUBLIC_KEY: EdDSAPublicKey = [
  "0d3388a18b89dd012cb965267ab959a6ca68f7e79abfdd5de5e3e80f86821a0d",
  "0babbc67ab5da6c9245137ae75461f64a90789ae5abf3737510d5442bbfa3113"
];
