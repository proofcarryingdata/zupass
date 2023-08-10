import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  Events,
  GatewayIntentBits,
  Interaction,
  SlashCommandBuilder,
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

    this.registerSlashCommands();
    this.handleInteraction();
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

  private async registerSlashCommands() {
    if (!process.env.DISCORD_TOKEN) return;

    logger("[DISCORD] register slash commands");

    const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN!);

    const commandsRaw = [
      new SlashCommandBuilder()
        .setName("verify")
        .setDescription(
          'Verify with your PCD'
        ),
    ]
    const commands = commandsRaw.map((command) => command.toJSON());

    await rest.put(Routes.applicationCommands(this.client.user!.id), { body: commands });
  }

  private async handleInteraction() {
    this.client.on(Events.InteractionCreate, async (interaction: Interaction): Promise<any> => {
      if (!interaction.isChatInputCommand()) return;

      if (interaction.commandName === "verify") {
        const guildId = interaction.guildId;

        if (guildId === null) {
          interaction.reply({
            content: "Use this command in a server you would like to join",
            ephemeral: true
          }).catch((e) => {
            logger(e);
          })
          return;
        }

        const url = `${process.env.DISCORD_VERIFY_URL}?guild_id=${guildId}&user_id=${interaction.user.id}`;
        const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setLabel("Verify")
            .setStyle(ButtonStyle.Link)
            .setURL(url)
        );
        interaction.reply({
          content:  "To join other channels in this server, click the button to verify with your PCD",
          components: [actionRow],
          ephemeral: true
        }).catch((e) => {
          logger(e);
        })
      }
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
  const clientPromise = new Promise<Client | null>((resolve, reject) => {
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
