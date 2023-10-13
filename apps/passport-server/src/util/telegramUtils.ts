import { getEdDSAPublicKey } from "@pcd/eddsa-pcd";
import { EdDSATicketPCDPackage } from "@pcd/eddsa-ticket-pcd";
import { constructZupassPcdGetRequestUrl } from "@pcd/passport-interface";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import {
  EdDSATicketFieldsToReveal,
  ZKEdDSAEventTicketPCD,
  ZKEdDSAEventTicketPCDArgs,
  ZKEdDSAEventTicketPCDPackage
} from "@pcd/zk-eddsa-event-ticket-pcd";
import { Context, SessionFlavor } from "grammy";
import {
  Chat,
  ChatFromGetChat,
  ChatMemberAdministrator,
  ChatMemberOwner
} from "grammy/types";
import { Pool } from "postgres-pool";
import {
  ChatIDWithEventIDs,
  ChatIDWithEventsAndMembership,
  LinkedPretixTelegramEvent,
  fetchTelegramChatsWithMembershipStatus
} from "../database/queries/telegram/fetch";
import { logger } from "./logger";

export type TopicChat = Chat.GroupChat | Chat.SupergroupChat | null;

type ChatIDWithChat<T extends LinkedPretixTelegramEvent | ChatIDWithEventIDs> =
  T & {
    chat: TopicChat;
  };

export interface SessionData {
  dbPool: Pool;
  selectedEvent?: LinkedPretixTelegramEvent;
  lastMessageId?: number;
  selectedChat?: TopicChat;
}

export type BotContext = Context & SessionFlavor<SessionData>;

export const base64EncodeTopicData = (
  chatId: number | string,
  topicName: string,
  topicId: number | string,
  validEventIds: string[]
): string => {
  const topicData = Buffer.from(
    encodeURIComponent(
      JSON.stringify({
        chatId,
        topicName,
        topicId,
        validEventIds
      })
    ),
    "utf-8"
  );
  const encodedTopicData = topicData.toString("base64");
  if (encodedTopicData.length > 512)
    throw new Error("Topic data too big for telegram startApp parameter");

  return encodedTopicData;
};

function isFulfilled<T>(
  promiseSettledResult: PromiseSettledResult<T>
): promiseSettledResult is PromiseFulfilledResult<T> {
  return promiseSettledResult.status === "fulfilled";
}

// Fetches the chat object for a list contaning a telegram chat id
export const chatIDsToChats = async <
  T extends LinkedPretixTelegramEvent | ChatIDWithEventIDs
>(
  db: Pool,
  ctx: BotContext,
  chats: T[]
): Promise<ChatIDWithChat<T>[]> => {
  const chatIDsToChatRequests = chats.map(async (e) => {
    return {
      ...e,
      chat: e.telegramChatID
        ? ((await ctx.api.getChat(e.telegramChatID)) as TopicChat)
        : null
    };
  });
  const eventsWithChatsSettled = await Promise.allSettled(
    chatIDsToChatRequests
  );

  const eventsWithChats = eventsWithChatsSettled
    .filter(isFulfilled)
    .map((e) => e.value);

  return eventsWithChats;
};

export const getChatsWithMembershipStatus = async (
  db: Pool,
  ctx: BotContext,
  userId: number
): Promise<ChatIDWithChat<ChatIDWithEventsAndMembership>[]> => {
  const chatIdsWithMembership = await fetchTelegramChatsWithMembershipStatus(
    db,
    userId
  );

  const chatsWithMembership = await chatIDsToChats(
    db,
    ctx,
    chatIdsWithMembership
  );

  return chatsWithMembership;
};

export const findChatByEventIds = (
  chats: ChatIDWithEventIDs[],
  eventIds: string[]
): string | null => {
  if (eventIds.length === 0) return null;
  for (const chat of chats) {
    if (eventIds.every((eventId) => chat.ticketEventIds.includes(eventId))) {
      return chat.telegramChatID;
    }
  }
  return null;
};

export const senderIsAdmin = async (
  ctx: Context,
  admins?: (ChatMemberOwner | ChatMemberAdministrator)[]
): Promise<boolean> => {
  const adminList = admins || (await ctx.getChatAdministrators());
  const username = ctx.from?.username;
  const admin =
    !!username && !!adminList.find((a) => a.user.username === username);
  if (!admin) logger("[TELEGRAM]", username, `is not an admin`);
  return admin;
};

export const getSessionKey = (ctx: Context): string | undefined => {
  // Give every user their one personal session storage per chat with the bot
  // (an independent session for each group and their private chat)
  return ctx.from === undefined || ctx.chat === undefined
    ? undefined
    : `${ctx.from.id}/${ctx.chat.id}`;
};

export const isDirectMessage = (ctx: Context): boolean => {
  return !!(ctx.chat?.type && ctx.chat?.type === "private");
};

export const isGroupWithTopics = (ctx: Context): boolean => {
  return !!(ctx.chat?.type && ctx.chat?.type === "supergroup");
};

export const checkDeleteMessage = (ctx: BotContext): void => {
  if (ctx.chat?.id && ctx.session?.lastMessageId) {
    ctx.api.deleteMessage(ctx.chat.id, ctx.session.lastMessageId);
    ctx.session.lastMessageId = 0;
  }
};

export const editOrSendMessage = async (
  ctx: BotContext,
  replyText: string
): Promise<void> => {
  if (ctx.chat?.id && ctx.session.lastMessageId) {
    await ctx.api.editMessageText(
      ctx.chat?.id,
      ctx.session.lastMessageId,
      "...",
      {
        parse_mode: "HTML"
      }
    );
    await ctx.api.editMessageText(
      ctx.chat?.id,
      ctx.session.lastMessageId,
      replyText,
      {
        parse_mode: "HTML"
      }
    );
  } else {
    const msg = await ctx.reply(replyText, { parse_mode: "HTML" });
    ctx.session.lastMessageId = msg.message_id;
  }
};

export const generateProofUrl = (
  telegramUserId: string,
  validEventIds: string[]
): string => {
  const fieldsToReveal: EdDSATicketFieldsToReveal = {
    revealTicketId: false,
    revealEventId: false,
    revealProductId: false,
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
      userProvided: true,
      displayName: "Your Ticket",
      description: "",
      validatorParams: {
        eventIds: validEventIds,
        productIds: [],
        // TODO: surface which event ticket we are looking for
        notFoundMessage: "You don't have a ticket to this event."
      },
      hideIcon: true
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
      userProvided: false,
      hideIcon: true
    },
    externalNullifier: {
      argumentType: ArgumentTypeName.BigInt,
      value: undefined,
      userProvided: false
    },
    validEventIds: {
      argumentType: ArgumentTypeName.StringArray,
      value: validEventIds,
      userProvided: false
    },
    watermark: {
      argumentType: ArgumentTypeName.BigInt,
      value: telegramUserId.toString(),
      userProvided: false,
      description: `This encodes your Telegram user ID so that the proof can grant only you access to the TG group.`
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
    title: "",
    description:
      "Zucat requests a zero-knowledge proof of your ticket to join a Telegram group."
  });
  return proofUrl;
};

export const verifyZKEdDSAEventTicketPCD = async (
  serializedZKEdDSATicket: string
): Promise<ZKEdDSAEventTicketPCD | null> => {
  let pcd: ZKEdDSAEventTicketPCD;

  try {
    pcd = await ZKEdDSAEventTicketPCDPackage.deserialize(
      JSON.parse(serializedZKEdDSATicket).pcd
    );
  } catch (e) {
    throw new Error(`Deserialization error, ${e}`);
  }

  let signerMatch = false;

  if (!process.env.SERVER_EDDSA_PRIVATE_KEY)
    throw new Error(`Missing server eddsa private key .env value`);

  // This Pubkey value should work for staging + prod as well, but needs to be tested
  const TICKETING_PUBKEY = await getEdDSAPublicKey(
    process.env.SERVER_EDDSA_PRIVATE_KEY
  );

  signerMatch =
    pcd.claim.signer[0] === TICKETING_PUBKEY[0] &&
    pcd.claim.signer[1] === TICKETING_PUBKEY[1];

  if (
    // TODO: wrap in a MultiProcessService?
    (await ZKEdDSAEventTicketPCDPackage.verify(pcd)) &&
    signerMatch
  ) {
    return pcd;
  } else {
    logger("[TELEGRAM] pcd invalid");
    return null;
  }
};

export const chatIsGroup = (
  chat: ChatFromGetChat
): chat is Chat.GroupGetChat | Chat.SupergroupGetChat => {
  // Chat must be a group chat of some kind
  return (
    chat?.type === "channel" ||
    chat?.type === "group" ||
    chat?.type === "supergroup"
  );
};
