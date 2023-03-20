import { ZuParticipant } from "@pcd/passport-interface";
import { config } from "./config";

export function loadSelf(): ZuParticipant | undefined {
  const self = window.localStorage["self"];
  if (self != null && self !== "") {
    return JSON.parse(self);
  }
}

export function saveSelf(self: ZuParticipant) {
  window.localStorage["self"] = JSON.stringify(self);
}

export async function fetchParticipant(
  uuid: string
): Promise<ZuParticipant | null> {
  const url = config.passportServer + "/zuzalu/participant/" + uuid;
  console.log(`Fetching ${url}`);
  const res = await fetch(url);
  if (!res.ok) return null;
  return (await res.json()) as ZuParticipant;
}
