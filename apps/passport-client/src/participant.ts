import { ZuParticipant } from "@pcd/passport-interface";
import { config } from "./config";

export async function fetchParticipant(uuid: string): Promise<ZuParticipant> {
  const url = `${config.passportServer}/zuzalu/participant/${uuid}`;
  console.log(`Polling ${url}`);
  try {
    const response = await fetch(url);
    const participant = await response.json();
    return participant;
  } catch (e) {
    console.error("Error polling participant", e);
  }
}
