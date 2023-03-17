import { ZuzaluParticipant } from "@pcd/passport-interface";
import { config } from "./config";

export function loadSelf(): ZuzaluParticipant | undefined {
  const self = window.localStorage["self"];
  if (self != null && self !== "") {
    return JSON.parse(self);
  }
}

export function saveSelf(self: ZuzaluParticipant) {
  window.localStorage["self"] = JSON.stringify(self);
}

export async function fetchParticipant(
  commitment: string
): Promise<ZuzaluParticipant | null> {
  const url = config.passportServer + "/zuzalu/participant/" + commitment;
  console.log(`Fetching ${url}`);
  const res = await fetch(url);
  if (!res.ok) return null;
  return (await res.json()) as ZuzaluParticipant;
}
