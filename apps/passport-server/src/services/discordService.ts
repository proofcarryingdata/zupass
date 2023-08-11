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
import { IS_PROD } from "../util/isProd";
import { logger } from "../util/logger";
import { traced } from "./telemetryService";

// Only SemaphoreGroupPCD is supported for now
const authorizationMap = [
  {
    guildId: "1138792489025802291",
    roleId: "1139265041116446730",
    groupUrl: IS_PROD? "https://api.pcdpass.xyz/semaphore/5"
      : "http://localhost:3002/semaphore/5",
  }
]

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
            content: "Use this command in a server to get new roles",
            ephemeral: true
          }).catch((e) => {
            logger(e);
          })
          return;
        }

        // TODO: to support multiple roles in a guild,
        // the user can choose different roles as part of the slash command
        const entry = authorizationMap.find((a) => a.guildId === guildId);
        if (!entry) {
          interaction.reply({
            content:  "This command is not supported in this server",
            ephemeral: true
          }).catch((e) => {
            logger(e);
          })
          return;
        }

        const url = `${
          process.env.DISCORD_VERIFY_URL
        }?user_id=${interaction.user.id}&guild_id=${guildId}&group_url=${entry.groupUrl}`;
        const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setLabel("Verify")
            .setStyle(ButtonStyle.Link)
            .setURL(url)
        );
        interaction.reply({
          content:  "To get new roles in this server, click the button to verify your identity with PCD",
          components: [actionRow],
          ephemeral: true
        }).catch((e) => {
          logger(e);
        })
      }
    });
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

  public async assignRole(userId: string, guildId: string): Promise<Boolean> {
    const entry = authorizationMap.find((a) => a.guildId === guildId);
    if (!entry) {
      return false;
    }

    const guild = await this.client.guilds.fetch(guildId);
    if (!guild) return false;

    const member = await guild.members.fetch(userId);
    if (!member) return false;

    await member.roles.add(entry.roleId);
    await member.user.send(`Congrats! Assigned you a new role in the server - ${guild.name}.`);

    return true;
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
