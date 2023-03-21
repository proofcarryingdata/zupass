import { ZuParticipant } from "@pcd/passport-interface";
import { config } from "./config";

export async function fetchParticipant(
  uuid: string
): Promise<ZuParticipant | null> {
  const url = config.passportServer + "/zuzalu/participant/" + uuid;
  console.log(`Fetching ${url}`);
  const res = await fetch(url);
  if (!res.ok) return null;
  return (await res.json()) as ZuParticipant;
}
