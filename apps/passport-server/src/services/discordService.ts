import {
  Client,
  Events,
  GatewayIntentBits,
  TextBasedChannel
} from "discord.js";
import { logger } from "../util/logger";
import { traced } from "./telemetryService";

export class DiscordService {
  private readonly client: Client;
  private readonly alertsChannel: TextBasedChannel | undefined;

  public constructor(client: Client, alertsChannelId: string) {
    this.client = client;

    const alertsChannel = client.channels.cache.get(alertsChannelId);
    if (alertsChannel?.isTextBased()) {
      this.alertsChannel = alertsChannel;
    }
  }

  public async sendAlert(msg: string): Promise<void> {
    if (process.env.NODE_ENV !== "production") {
      logger("[DISCORD] not in production, not sending alert");
      return;
    }

    traced("Discord", "sendAlert", async () => {
      logger(`[DISCORD] sending alert ${msg}`);
      this.alertsChannel?.send(msg);
    });
  }
}

export async function startDiscordService(): Promise<DiscordService | null> {
  logger(`[INIT] initializing Discord`);

  if (!process.env.DISCORD_ALERTS_CHANNEL_ID) {
    logger(
      `[INIT] missing DISCORD_ALERTS_CHANNEL_ID, not instantiating discord service`
    );
    return null;
  }

  const client = await instantiateDiscordClient();

  if (!client) {
    logger(`[INIT] couldn't instantiate a discord client`);
    return null;
  }

  return new DiscordService(client, process.env.DISCORD_ALERTS_CHANNEL_ID);
}

async function instantiateDiscordClient(): Promise<Client | null> {
  if (process.env.DISCORD_TOKEN === null) {
    return null;
  }

  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  const clientPromise = new Promise<Client | null>((resolve, _reject) => {
    client.once(Events.ClientReady, (c) => {
      logger(`[DISCORD] Ready! Logged in as ${c.user.tag}`);
      resolve(c);
    });
    client.on(Events.Error, (e) => {
      logger(e);
    });
  });
  client.login(process.env.DISCORD_TOKEN);
  return clientPromise;
}
