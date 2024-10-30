import {
  Client,
  Events,
  GatewayIntentBits,
  TextBasedChannel
} from "discord.js";
import { ApplicationContext, ServerMode } from "../types";
import { logger } from "../util/logger";
import { traced } from "./telemetryService";

export class DiscordService {
  private readonly clientPromise: Promise<Client>;
  private readonly alertsChannelId: string;

  public constructor(clientPromise: Promise<Client>, alertsChannelId: string) {
    this.clientPromise = clientPromise;
    this.alertsChannelId = alertsChannelId;
  }

  public async sendAlert(msg: string): Promise<unknown> {
    return traced("Discord", "sendAlert", async () => {
      logger(`[DISCORD] getting client`);

      const client = await this.clientPromise;
      const alertsChannel = client.channels.cache.get(
        this.alertsChannelId
      ) as TextBasedChannel;

      logger(`[DISCORD] sending alert ${msg}`);
      return alertsChannel?.send(msg);
    });
  }

  public async stop(): Promise<void> {
    const client = await this.clientPromise;
    client.destroy();
  }
}

export async function startDiscordService(
  context: ApplicationContext
): Promise<DiscordService | null> {
  logger(`[INIT] initializing Discord`);

  if (![ServerMode.UNIFIED, ServerMode.PARALLEL_MAIN].includes(context.mode)) {
    logger(
      `[INIT] discord service not started, not in unified or parallel main mode`
    );
    return null;
  }

  if (!process.env.DISCORD_ALERTS_CHANNEL_ID) {
    logger(
      `[INIT] missing DISCORD_ALERTS_CHANNEL_ID, not instantiating discord service`
    );
    return null;
  }

  if (!process.env.DISCORD_TOKEN) {
    logger(`[INIT] missing DISCORD_TOKEN, not instantiating discord service`);
    return null;
  }

  return new DiscordService(
    instantiateDiscordClient(process.env.DISCORD_TOKEN),
    process.env.DISCORD_ALERTS_CHANNEL_ID
  );
}

async function instantiateDiscordClient(discordToken: string): Promise<Client> {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  const clientPromise = new Promise<Client>((resolve, _reject) => {
    client.once(Events.ClientReady, (c) => {
      logger(`[DISCORD] Ready! Logged in as ${c.user.tag}`);
      resolve(c);
    });
    client.on(Events.Error, (e) => {
      logger(e);
    });
  });
  client.login(discordToken);
  return clientPromise;
}
