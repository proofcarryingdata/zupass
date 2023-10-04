import { Menu } from "@grammyjs/menu";
import { getEdDSAPublicKey } from "@pcd/eddsa-pcd";
import { EdDSATicketPCDPackage } from "@pcd/eddsa-ticket-pcd";
import { constructZupassPcdGetRequestUrl } from "@pcd/passport-interface";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { sleep } from "@pcd/util";
import {
  EdDSATicketFieldsToReveal,
  ZKEdDSAEventTicketPCD,
  ZKEdDSAEventTicketPCDArgs,
  ZKEdDSAEventTicketPCDPackage
} from "@pcd/zk-eddsa-event-ticket-pcd";
import { Bot, InlineKeyboard, session } from "grammy";
import { Chat, ChatFromGetChat } from "grammy/types";
import sha256 from "js-sha256";
import _ from "lodash";
import { fetchPretixEventInfo } from "../database/queries/pretixEventInfo";
import { deleteTelegramVerification } from "../database/queries/telegram/deleteTelegramVerification";
import { fetchTelegramVerificationStatus } from "../database/queries/telegram/fetchTelegramConversation";
import {
  fetchLinkedPretixAndTelegramEvents,
  fetchTelegramEventByEventId,
  fetchTelegramEventsByChatId
} from "../database/queries/telegram/fetchTelegramEvent";
import {
  insertTelegramEvent,
  insertTelegramVerification
} from "../database/queries/telegram/insertTelegramConversation";
import { ApplicationContext } from "../types";
import { logger } from "../util/logger";
import {
  BotContext,
  SessionData,
  dynamicEvents,
  getSessionKey,
  isDirectMessage,
  isGroupWithTopics,
  senderIsAdmin
} from "../util/telegramHelpers";
import { isLocalServer } from "../util/util";
import { RollbarService } from "./rollbarService";

const ALLOWED_EVENTS = [
  { eventId: "3fa6164c-4785-11ee-8178-763dbf30819c", name: "SRW Staging" },
  { eventId: "264b2536-479c-11ee-8153-de1f187f7393", name: "SRW Prod" },
  {
    eventId: "b03bca82-2d63-11ee-9929-0e084c48e15f",
    name: "ProgCrypto (Internal Test)"
  },
  {
    eventId: "ae23e4b4-2d63-11ee-9929-0e084c48e15f",
    name: "AW (Internal Test)"
  }
  // Add this value and set the value field of validEventIds in generateProofUrl
  // { eventId: "<copy from id field of pretix_events_config", name: "<Your Local Event>" }
];

const ALLOWED_TICKET_MANAGERS = [
  "cha0sg0d",
  "notdavidhuang",
  "richardyliu",
  "gubsheep",
  "chubivan"
];

const adminBotChannel = "Admin Central";
const eventIdsAreValid = (eventIds?: string[]): boolean => {
  const isNonEmptySubset = (superset: string[], subset?: string[]): boolean =>
    !!(subset && subset.length && _.difference(subset, superset).length === 0);

  return isNonEmptySubset(
    ALLOWED_EVENTS.map((e) => e.eventId),
    eventIds
  );
};

export class TelegramService {
  private context: ApplicationContext;
  private bot: Bot<BotContext>;
  private rollbarService: RollbarService | null;

  public constructor(
    context: ApplicationContext,
    rollbarService: RollbarService | null,
    bot: Bot<BotContext>
  ) {
    this.context = context;
    this.rollbarService = rollbarService;
    this.bot = bot;

    this.bot.api.setMyDescription(
      "I'm Zucat 🐱 ! I manage fun events with zero-knowledge proofs. Press START to get started!"
    );

    this.bot.api.setMyShortDescription(
      "Zucat manages events and groups with zero-knowledge proofs"
    );

    const zupassMenu = new Menu("zupass");
    const eventsMenu = new Menu<BotContext>("events");
    const anonSendMenu = new Menu("anonsend");

    // Uses the dynamic range feature of Grammy menus https://grammy.dev/plugins/menu#dynamic-ranges
    // /link and /unlink are unstable right now, pending fixes
    eventsMenu.dynamic(dynamicEvents);
    zupassMenu.dynamic((ctx, range) => {
      const userId = ctx?.from?.id;
      if (userId) {
        const proofUrl = this.generateProofUrl(userId.toString());
        range.webApp(`Generate proof 🚀`, proofUrl);
      } else {
        ctx.reply(
          `Unable to locate your Telegram account. Please try again, or contact passport@0xparc.org`
        );
      }
      return range;
    });

    anonSendMenu.dynamic((_, menu) => {
      const zktgUrl =
        process.env.TELEGRAM_ANON_WEBSITE ?? "https://dev.local:4000/";
      menu.webApp("Send anonymous message", zktgUrl);
      return menu;
    });

    this.bot.use(eventsMenu);
    this.bot.use(zupassMenu);
    this.bot.use(anonSendMenu);

    // Users gain access to gated chats by requesting to join. The bot
    // receives a notification of this, and will approve requests from
    // users who have verified their possession of a matching PCD.
    // Approval of the join request is required even for users with the
    // invite link - see `creates_join_request` parameter on
    // `createChatInviteLink` API invocation below.
    this.bot.on("chat_join_request", async (ctx) => {
      const userId = ctx.chatJoinRequest.user_chat_id;

      try {
        const chatId = ctx.chatJoinRequest.chat.id;

        logger(`[TELEGRAM] Got chat join request for ${chatId} from ${userId}`);
        // Check if this user is verified for the chat in question
        const isVerified = await fetchTelegramVerificationStatus(
          this.context.dbPool,
          userId,
          chatId
        );

        if (isVerified) {
          logger(
            `[TELEGRAM] Approving chat join request for ${userId} to join ${chatId}`
          );
          await this.bot.api.sendMessage(
            userId,
            `<i>Verifying and inviting...</i>`,
            { parse_mode: "HTML" }
          );
          await this.bot.api.approveChatJoinRequest(chatId, userId);
          const chat = (await this.bot.api.getChat(
            chatId
          )) as Chat.GroupGetChat;
          const inviteLink = await ctx.createChatInviteLink();
          await this.bot.api.sendMessage(
            userId,
            `You're approved for <b>${chat.title}</b>`,
            {
              reply_markup: new InlineKeyboard().url(
                `Join 🤝`,
                inviteLink.invite_link
              ),
              parse_mode: "HTML"
            }
          );
          await this.bot.api.sendMessage(userId, `Congrats!`);
        }
      } catch (e) {
        await this.bot.api.sendMessage(userId, `Error joining: ${e}`);
        logger("[TELEGRAM] chat_join_request error", e);
        this.rollbarService?.reportError(e);
      }
    });

    // When a user joins the channel, remove their verification, so they
    // cannot rejoin without verifying again.
    this.bot.on("chat_member", async (ctx) => {
      try {
        const newMember = ctx.update.chat_member.new_chat_member;
        if (newMember.status === "member") {
          logger(
            `[TELEGRAM] Deleting verification for user ${newMember.user.id} in chat ${ctx.chat.id}`
          );
          await deleteTelegramVerification(
            this.context.dbPool,
            newMember.user.id,
            ctx.chat.id
          );
        }
      } catch (e) {
        logger("[TELEGRAM] chat_member error", e);
        this.rollbarService?.reportError(e);
      }
    });

    // The "start" command initiates the process of invitation and approval.
    this.bot.command("start", async (ctx) => {
      const userId = ctx?.from?.id;
      try {
        // Only process the command if it comes as a private message.
        if (isDirectMessage(ctx) && userId) {
          const username = ctx?.from?.username;
          const firstName = ctx?.from?.first_name;
          const name = firstName || username;
          await ctx.reply(
            `Welcome ${name}! 👋\n\nClick below to ZK prove that you have a ticket to an event, so I can add you to the attendee Telegram group!\n\nYou must have one of the following tickets in your Zupass account to join successfully.\n\nSee you soon 😽`
          );
          const msg = await ctx.reply(`Loading tickets and events..`);
          const events = await fetchLinkedPretixAndTelegramEvents(
            this.context.dbPool
          );
          const eventsWithChatsRequests = events.map(async (e) => {
            return {
              ...e,
              chat: e.telegramChatID
                ? await this.bot.api.getChat(e.telegramChatID)
                : null
            };
          });
          const eventsWithChatsSettled = await Promise.allSettled(
            eventsWithChatsRequests
          );
          const eventsWithChats = eventsWithChatsSettled
            .filter((e) => e.status == "fulfilled")
            // @ts-expect-error value after filtering for success
            .map((e) => e.value);

          if (eventsWithChats.length === 0) {
            return ctx.api.editMessageText(
              userId,
              msg.message_id,
              `No chats found to join. If you are an admin of a group, you can add me and type /manage to link an event.`,
              {
                parse_mode: "HTML"
              }
            );
          }

          let eventsHtml = `<b> Current Chats with Events </b>\n\n`;

          for (const event of eventsWithChats) {
            if (event.chat?.title)
              eventsHtml += `Event: <b>${event.eventName}</b> ➡ Chat: <i>${event.chat.title}</i>\n`;
          }
          await ctx.api.editMessageText(userId, msg.message_id, eventsHtml, {
            parse_mode: "HTML"
          });
          await ctx.reply(`Click here ⬇`, {
            reply_markup: zupassMenu
          });
        }
      } catch (e) {
        logger("[TELEGRAM] start error", e);
        this.rollbarService?.reportError(e);
      }
    });

    // The "link <eventName>" command is a dev utility for associating the channel Id with a given event.
    this.bot.command("manage", async (ctx) => {
      const messageThreadId = ctx?.message?.message_thread_id;

      try {
        const admins = await ctx.getChatAdministrators();
        const username = ctx?.from?.username;
        if (!username) throw new Error(`Username not found`);

        if (!(await senderIsAdmin(ctx, admins)))
          throw new Error(`Only admins can run this command`);
        if (!ALLOWED_TICKET_MANAGERS.includes(username))
          throw new Error(
            `Only Zupass team members are allowed to run this command.`
          );

        if (!isGroupWithTopics(ctx)) {
          await ctx.reply(
            "This command only works in a group with Topics enabled.",
            { message_thread_id: messageThreadId }
          );
        }

        if (messageThreadId)
          return ctx.reply(`Must be in ${adminBotChannel}.`, {
            message_thread_id: messageThreadId
          });

        const botIsAdmin = admins.some(
          (admin) => admin.user.id === this.bot.botInfo.id
        );
        if (!botIsAdmin) {
          await ctx.reply(
            "Please add me as an admin to the telegram channel associated with your event.",
            { message_thread_id: messageThreadId }
          );
          return;
        }

        ctx.reply(
          `Choose an event to manage.\n\n <i>✅ = this chat is gated by event.</i>`,
          {
            reply_markup: eventsMenu,
            parse_mode: "HTML",
            message_thread_id: messageThreadId
          }
        );
      } catch (error) {
        await ctx.reply(`${error}`, { message_thread_id: messageThreadId });
        logger(`[TELEGRAM] ERROR`, error);
      }
    });

    this.bot.command("setup", async (ctx) => {
      const messageThreadId = ctx?.message?.message_thread_id;
      try {
        if (!isGroupWithTopics(ctx)) {
          throw new Error("Please enable topics for this group and try again");
        }

        if (ctx?.message?.is_topic_message)
          throw new Error(`Cannot run setup from an existing topic`);

        await ctx.editGeneralForumTopic(adminBotChannel);
        await ctx.hideGeneralForumTopic();
        const topic = await ctx.createForumTopic(`Announcements`, {
          icon_custom_emoji_id: "5309984423003823246" // 📢
        });
        await ctx.api.closeForumTopic(ctx.chat.id, topic.message_thread_id);
      } catch (error) {
        await ctx.reply(`❌ ${error}`, {
          reply_to_message_id: messageThreadId
        });
      }
    });

    this.bot.command("adminhelp", async (ctx) => {
      const messageThreadId = ctx?.message?.message_thread_id;
      await ctx.reply(
        `<b>Help</b>
    
        <b>Admins</b>
        <b>/manage</b> - Gate / Ungate this group with a ticketed event
        <b>/setup</b> - When the chat is created, hide the general channel and set up Announcements.
        <b>/incognito</b> - Mark a topic as anonymous
      `,
        { parse_mode: "HTML", reply_to_message_id: messageThreadId }
      );
    });

    this.bot.command("anonsend", async (ctx) => {
      if (!isDirectMessage(ctx)) {
        const messageThreadId = ctx.message?.message_thread_id;
        const chatId = ctx.chat.id;

        // if there is a message_thread_id or a chat_id, use reply settings.
        const replyOptions = messageThreadId
          ? { message_thread_id: messageThreadId }
          : chatId
          ? {}
          : undefined;

        if (replyOptions) {
          await ctx.reply(
            "Please message directly within a private chat.",
            replyOptions
          );
        }
        return;
      }

      await ctx.reply("Click below to anonymously send a message.", {
        reply_markup: anonSendMenu
      });
    });

    this.bot.command("incognito", async (ctx) => {
      const messageThreadId = ctx.message?.message_thread_id;
      if (!messageThreadId) {
        logger("[TELEGRAM] message thread id not found");
        return;
      }

      if (!isGroupWithTopics(ctx)) {
        await ctx.reply(
          "This command only works in a group with Topics enabled.",
          { message_thread_id: messageThreadId }
        );
      }

      if (!(await senderIsAdmin(ctx)))
        return ctx.reply(`Only admins can run this command`);

      try {
        const telegramEvents = await fetchTelegramEventsByChatId(
          this.context.dbPool,
          ctx.chat.id
        );
        const hasLinked = telegramEvents.length > 0;
        if (!hasLinked) {
          await ctx.reply(
            "This group is not linked to an event. Please use /link to link this group to an event.",
            { message_thread_id: messageThreadId }
          );
          return;
        } else if (telegramEvents.filter((e) => e.anon_chat_id).length > 0) {
          await ctx.reply(
            `This group has already linked an anonymous channel.`,
            { message_thread_id: messageThreadId }
          );
          return;
        }

        await insertTelegramEvent(
          this.context.dbPool,
          telegramEvents[0].ticket_event_id,
          telegramEvents[0].telegram_chat_id,
          messageThreadId
        );

        await ctx.reply(
          `Successfully linked anonymous channel. DM me with /anonsend to anonymously send a message.`,
          { message_thread_id: messageThreadId }
        );
      } catch (error) {
        logger(`[ERROR] ${error}`);
        await ctx.reply(`Failed to link anonymous chat. Check server logs`, {
          message_thread_id: messageThreadId
        });
      }
    });
  }

  private generateProofUrl(telegramUserId: string): string {
    const fieldsToReveal: EdDSATicketFieldsToReveal = {
      revealTicketId: false,
      revealEventId: true,
      revealProductId: true,
      revealTimestampConsumed: false,
      revealTimestampSigned: false,
      revealAttendeeSemaphoreId: true,
      revealIsConsumed: false,
      revealIsRevoked: false
    };

    const args: ZKEdDSAEventTicketPCDArgs = {
      ticket: {
        argumentType: ArgumentTypeName.PCD,
        pcdType: EdDSATicketPCDPackage.name,
        value: undefined,
        userProvided: true
      },
      identity: {
        argumentType: ArgumentTypeName.PCD,
        pcdType: SemaphoreIdentityPCDPackage.name,
        value: undefined,
        userProvided: true
      },
      fieldsToReveal: {
        argumentType: ArgumentTypeName.ToggleList,
        value: fieldsToReveal,
        userProvided: false
      },
      externalNullifier: {
        argumentType: ArgumentTypeName.BigInt,
        value: undefined,
        userProvided: false
      },
      validEventIds: {
        argumentType: ArgumentTypeName.StringArray,
        // For local development, we do not validate eventIds
        // If you want to test eventId validation locally, copy the `id` field from `pretix_events_config`
        // and add it to ALLOWED_EVENTS. Then set value: ALLOWED_EVENTS.map((e) => e.eventId)
        value: isLocalServer()
          ? undefined
          : ALLOWED_EVENTS.map((e) => e.eventId),
        userProvided: false
      },
      watermark: {
        argumentType: ArgumentTypeName.BigInt,
        value: telegramUserId.toString(),
        userProvided: false
      }
    };

    let passportOrigin = `${process.env.PASSPORT_CLIENT_URL}/`;
    if (passportOrigin === "http://localhost:3000/") {
      // TG bot doesn't like localhost URLs
      passportOrigin = "http://127.0.0.1:3000/";
    }
    const returnUrl = `${process.env.PASSPORT_SERVER_URL}/telegram/verify/${telegramUserId}`;

    const proofUrl = constructZupassPcdGetRequestUrl<
      typeof ZKEdDSAEventTicketPCDPackage
    >(passportOrigin, returnUrl, ZKEdDSAEventTicketPCDPackage.name, args, {
      genericProveScreen: true,
      title: "ZK Ticket Proof",
      description:
        "Generate a zero-knowledge proof that you have an EdDSA ticket for a conference event! Select your ticket from the dropdown below."
    });
    return proofUrl;
  }

  /**
   * Telegram does not allow two instances of a bot to be running at once.
   * During deployment, a new instance of the app will be started before the
   * old one is shut down, so we might end up with two instances running at
   * the same time. This method allows us to delay starting the bot by an
   * amount configurable per-environment.
   *
   * Since this function awaits on bot.start(), it will likely be very long-
   * lived.
   */
  public async startBot(): Promise<void> {
    const startDelay = parseInt(process.env.TELEGRAM_BOT_START_DELAY_MS ?? "0");
    if (startDelay > 0) {
      logger(`[TELEGRAM] Delaying bot startup by ${startDelay} milliseconds`);
      await sleep(startDelay);
    }

    logger(`[TELEGRAM] Starting bot`);

    try {
      // This will not resolve while the bot remains running.
      await this.bot.start({
        allowed_updates: [
          "chat_join_request",
          "chat_member",
          "message",
          "callback_query"
        ],
        onStart: (info) => {
          logger(`[TELEGRAM] Started bot '${info.username}' successfully!`);
        }
      });
    } catch (e) {
      logger(`[TELEGRAM] Error starting bot`, e);
      this.rollbarService?.reportError(e);
    }
  }

  public async getBotURL(): Promise<string> {
    const { username } = await this.bot.api.getMe();
    return `https://t.me/${username}`;
  }

  private async verifyZKEdDSAEventTicketPCD(
    serializedZKEdDSATicket: string
  ): Promise<ZKEdDSAEventTicketPCD | null> {
    let pcd: ZKEdDSAEventTicketPCD;

    try {
      pcd = await ZKEdDSAEventTicketPCDPackage.deserialize(
        JSON.parse(serializedZKEdDSATicket).pcd
      );
    } catch (e) {
      throw new Error(`Deserialization error, ${e}`);
    }

    // this is very bad but i am very tired
    // hardcoded eventIDs and signing keys for SRW
    let signerMatch = false;
    let eventIdMatch = false;

    if (!process.env.SERVER_EDDSA_PRIVATE_KEY)
      throw new Error(`Missing server eddsa private key .env value`);

    // This Pubkey value should work for staging + prod as well, but needs to be tested
    const TICKETING_PUBKEY = await getEdDSAPublicKey(
      process.env.SERVER_EDDSA_PRIVATE_KEY
    );

    if (isLocalServer()) {
      eventIdMatch = true;
      signerMatch =
        pcd.claim.signer[0] === TICKETING_PUBKEY[0] &&
        pcd.claim.signer[1] === TICKETING_PUBKEY[1];
    } else if (process.env.PASSPORT_SERVER_URL?.includes("staging")) {
      eventIdMatch = eventIdsAreValid(pcd.claim.validEventIds);
      signerMatch =
        pcd.claim.signer[0] === TICKETING_PUBKEY[0] &&
        pcd.claim.signer[1] === TICKETING_PUBKEY[1];
    } else {
      eventIdMatch = eventIdsAreValid(pcd.claim.validEventIds);
      signerMatch =
        pcd.claim.signer[0] === TICKETING_PUBKEY[0] &&
        pcd.claim.signer[1] === TICKETING_PUBKEY[1];
    }

    if (
      (await ZKEdDSAEventTicketPCDPackage.verify(pcd)) &&
      eventIdMatch &&
      signerMatch
    ) {
      return pcd;
    } else {
      logger("[TELEGRAM] pcd invalid");
      return null;
    }
  }

  private chatIsGroup(
    chat: ChatFromGetChat
  ): chat is Chat.GroupGetChat | Chat.SupergroupGetChat {
    // Chat must be a group chat of some kind
    return (
      chat?.type === "channel" ||
      chat?.type === "group" ||
      chat?.type === "supergroup"
    );
  }

  private async sendToAnonymousChannel(
    groupId: number,
    anonChatId: number,
    message: string
  ): Promise<void> {
    await this.bot.api.sendMessage(groupId, message, {
      message_thread_id: anonChatId
    });
  }

  private async sendInviteLink(
    userId: number,
    chat: Chat.GroupGetChat | Chat.SupergroupGetChat,
    eventConfigID: string
  ): Promise<void> {
    // Send the user an invite link. When they follow the link, this will
    // trigger a "join request", which the bot will respond to.
    const event = await fetchPretixEventInfo(
      this.context.dbPool,
      eventConfigID
    );
    if (!event) {
      throw new Error(
        `User used a ticket with no corresponding event confg id: ${eventConfigID}`
      );
    }

    logger(
      `[TELEGRAM] Creating chat invite link to ${chat.title}(${chat.id}) for ${userId}`
    );
    const inviteLink = await this.bot.api.createChatInviteLink(chat.id, {
      creates_join_request: true,
      name: "bot invite link"
    });
    await this.bot.api.sendMessage(
      userId,
      `You've proved that you have at ticket to <b>${event.event_name}</b>!\nPress this button to send your proof to <b>${chat.title}</b>`,
      {
        reply_markup: new InlineKeyboard().url(
          `Send ZK Proof ✈️`,
          inviteLink.invite_link
        ),
        parse_mode: "HTML"
      }
    );
  }

  /**
   * Verify that a PCD relates to an event, and that the event has an
   * associated chat. If so, invite the user to the chat and record them
   * for later approval when they request to join.
   *
   * This is called from the /telegram/verify route.
   */
  public async handleVerification(
    serializedZKEdDSATicket: string,
    telegramUserId: number
  ): Promise<void> {
    // Verify PCD
    const pcd = await this.verifyZKEdDSAEventTicketPCD(serializedZKEdDSATicket);

    if (!pcd) {
      throw new Error(`Could not verify PCD for ${telegramUserId}`);
    }
    const { watermark } = pcd.claim;

    if (!watermark) {
      throw new Error("Verification PCD did not contain watermark");
    }

    if (telegramUserId.toString() !== watermark.toString()) {
      throw new Error(
        `Telegram User id ${telegramUserId} does not match given watermark ${watermark}`
      );
    }

    const { eventId } = pcd.claim.partialTicket;
    if (!eventId) {
      throw new Error(
        `User ${telegramUserId} returned a ZK-ticket with no eventId.`
      );
    }

    logger(`[TELEGRAM] Verified PCD for ${telegramUserId}, event ${eventId}`);

    // Find the event which matches the PCD
    // For this to work, the `telegram_bot_events` table must be populated.

    const event = await fetchTelegramEventByEventId(
      this.context.dbPool,
      eventId
    );
    if (!event) {
      throw new Error(
        `User ${telegramUserId} attempted to use a ticket for event ${eventId}, which has no matching chat`
      );
    }

    // The event is linked to a chat. Make sure we can access it.
    const chatId = event.telegram_chat_id;
    const chat = await this.bot.api.getChat(chatId);
    if (!this.chatIsGroup(chat)) {
      throw new Error(
        `Event ${event.ticket_event_id} is configured with Telegram chat ${event.telegram_chat_id}, which is of incorrect type "${chat.type}"`
      );
    }

    // We've verified that the chat exists, now add the user to our list.
    // This will be important later when the user requests to join.
    await insertTelegramVerification(
      this.context.dbPool,
      telegramUserId,
      event.telegram_chat_id
    );

    // Send invite link
    await this.sendInviteLink(telegramUserId, chat, eventId);
  }

  public async handleSendAnonymousMessage(
    serializedZKEdDSATicket: string,
    message: string
  ): Promise<void> {
    logger("[TELEGRAM] Verifying anonymous message");

    const pcd = await this.verifyZKEdDSAEventTicketPCD(serializedZKEdDSATicket);

    if (!pcd) {
      throw new Error("Could not verify PCD for anonymous message");
    }

    const {
      watermark,
      partialTicket: { eventId }
    } = pcd.claim;

    if (!eventId) {
      throw new Error("Anonymous message PCD did not contain eventId");
    }

    if (!watermark) {
      throw new Error("Anonymous message PCD did not contain watermark");
    }

    function getMessageWatermark(message: string): bigint {
      const hashed = sha256.sha256(message).substring(0, 16);
      return BigInt("0x" + hashed);
    }

    if (getMessageWatermark(message).toString() !== watermark.toString()) {
      throw new Error(
        `Anonymous message string ${message} didn't match watermark. got ${watermark} and expected ${getMessageWatermark(
          message
        ).toString()}`
      );
    }

    const event = await fetchTelegramEventByEventId(
      this.context.dbPool,
      eventId
    );
    if (!event) {
      throw new Error(
        `Attempted to use a PCD to send anonymous message for event ${eventId}, which is not available`
      );
    }

    logger(
      `[TELEGRAM] Verified PCD for anonynmous message with event ${eventId}`
    );

    if (event.anon_chat_id == null) {
      throw new Error(`this group doesn't have an anon channel`);
    }

    // The event is linked to a chat. Make sure we can access it.
    const chatId = event.telegram_chat_id;
    const chat = await this.bot.api.getChat(chatId);
    if (!this.chatIsGroup(chat)) {
      throw new Error(
        `Event ${event.ticket_event_id} is configured with Telegram chat ${event.telegram_chat_id}, which is of incorrect type "${chat.type}"`
      );
    }

    await this.sendToAnonymousChannel(chat.id, event.anon_chat_id, message);
  }

  public stop(): void {
    this.bot.stop();
  }
}

export async function startTelegramService(
  context: ApplicationContext,
  rollbarService: RollbarService | null
): Promise<TelegramService | null> {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    logger(
      `[INIT] missing TELEGRAM_BOT_TOKEN, not instantiating Telegram service`
    );
    return null;
  }

  const bot = new Bot<BotContext>(process.env.TELEGRAM_BOT_TOKEN);
  const initial = (): SessionData => {
    return { dbPool: context.dbPool };
  };

  bot.use(session({ initial, getSessionKey }));
  await bot.init();

  const service = new TelegramService(context, rollbarService, bot);
  bot.catch((error) => {
    logger(`[TELEGRAM] Bot error`, error);
  });
  // Start the bot, but do not await on the result here.
  service.startBot();

  return service;
}
