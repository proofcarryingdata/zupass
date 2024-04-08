import { sleep } from "@pcd/util";
import { BallotType } from "@prisma/client";
import { CronJob } from "cron";
import { Api, Bot, Context, InlineKeyboard, RawApi } from "grammy";
import urlJoin from "url-join";
import { ApplicationContext } from "./application";
import { BOT_ZUPOLL_LINK, ZUPOLL_CLIENT_URL } from "./env";
import {
  deletePollReceiver,
  findTgTopic,
  getAllBallotsForAlerts,
  updateBallotExpiryNotif,
  upsertPollReceiver,
  upsertTgTopic
} from "./persistence";
import { cleanString, formatPollCreated, sendMessageV2 } from "./util/bot";
import { logger } from "./util/logger";

const telegramAlertRegardingBallots = async (
  bot: Bot<Context, Api<RawApi>>
) => {
  const ballots = await getAllBallotsForAlerts();

  for (const ballot of ballots) {
    const minutes = Math.ceil(
      (new Date(ballot.expiry).getTime() - Date.now()) / 60000
    );
    const hours = Math.ceil(minutes / 60);
    const days = Math.ceil(minutes / (24 * 60));

    const pollUrl = urlJoin(ZUPOLL_CLIENT_URL, `ballot?id=${ballot.ballotURL}`);
    const tgPollUrl = urlJoin(
      BOT_ZUPOLL_LINK ?? "",
      `?startapp=${ballot.ballotURL}`
    );

    if (days === 7 && ballot.expiryNotif === "NONE") {
      await updateBallotExpiryNotif(ballot.ballotURL, "WEEK");
      const expiryMessage = `<b>${cleanString(
        ballot.ballotTitle
      )}</b> will expire in less than 1 week.\n\nVote <a href="${tgPollUrl}">here</a> or in <a href="${pollUrl}">browser</a>`;
      await sendMessageV2(expiryMessage, ballot.ballotType, bot);
    } else if (
      hours === 24 &&
      (ballot.expiryNotif === "WEEK" || ballot.expiryNotif === "NONE")
    ) {
      await updateBallotExpiryNotif(ballot.ballotURL, "DAY");
      const expiryMessage = `<b>${cleanString(
        ballot.ballotTitle
      )}</b> will expire in less than 24 hours.\n\nVote <a href="${tgPollUrl}">here</a> or in <a href="${pollUrl}">browser</a>`;
      await sendMessageV2(expiryMessage, ballot.ballotType, bot);
    } else if (
      hours === 1 &&
      (ballot.expiryNotif === "DAY" || ballot.expiryNotif === "NONE")
    ) {
      await updateBallotExpiryNotif(ballot.ballotURL, "HOUR");
      const expiryMessage = `<b>${cleanString(
        ballot.ballotTitle
      )}</b> will expire in less than 1 hour!\n\nVote <a href="${tgPollUrl}">here</a> or in <a href="${pollUrl}">browser</a>`;
      await sendMessageV2(expiryMessage, ballot.ballotType, bot);
    }
  }
};

export async function startBot(context: ApplicationContext): Promise<void> {
  const botToken = process.env.BOT_TOKEN;

  if (!botToken) {
    logger.warn(`[INIT] missing botToken, not starting bot`);
    return;
  }

  // there can only be one bot active at a time - give the old service
  // some time to stop before starting the bot
  // await sleep(30 * 1000);
  context.bot = new Bot(botToken);

  context.bot.command("start", async (ctx) => {
    if (ctx.chat.type === "private") {
      ctx.reply(`Zupoll`, {
        reply_markup: new InlineKeyboard().url(
          `Zupoll`,
          process.env.BOT_ZUPOLL_LINK ?? `https://t.me/zupoll_prod_bot/poll`
        )
      });
    }
  });

  context.bot.command("latest", async (ctx) => {
    try {
      const ballots = await getAllBallotsForAlerts();

      for (const ballot of ballots) {
        // @ts-expect-error prisma
        const post = formatPollCreated(ballot, ballot.polls);
        await sendMessageV2(post, ballot.ballotType, context.bot, {
          userId: ctx.from?.id
        });
      }
    } catch (error) {
      //
    }
  });

  context.bot.command("listen", async (ctx) => {
    const message_thread_id = ctx.message?.message_thread_id;
    const chatId = ctx.chat.id;
    const topicId = ctx.update.message?.message_thread_id || 0;
    const tgTopicId = `${chatId}_${topicId}`;
    try {
      if (!ctx.match) throw new Error(`No polls to listen to found`);
      const ballotTypes = ctx.match.split(",") as BallotType[];
      ballotTypes.forEach((p) => {
        if (!Object.values(BallotType).includes(p))
          throw new Error(`POLL TYPE INVALID`);
      });
      const topicExists = await findTgTopic(tgTopicId);
      if (!topicExists)
        throw new Error(`Topic not found in DB. Edit it and try again`);
      await upsertPollReceiver(tgTopicId, ballotTypes);
      ctx.reply(`Listening to ${ballotTypes}`, {
        message_thread_id
      });
    } catch (error) {
      ctx.reply(`${error}`, {
        message_thread_id
      });
    }
  });

  context.bot.command("stoplisten", async (ctx) => {
    const message_thread_id = ctx.message?.message_thread_id;
    const chatId = ctx.chat.id;
    const topicId = ctx.update.message?.message_thread_id || 0;
    const tgTopicId = `${chatId}_${topicId}`;

    try {
      await deletePollReceiver(tgTopicId);
      ctx.reply(`No longer listening to polls`, { message_thread_id });
    } catch (error) {
      ctx.reply(`${error}`, {
        message_thread_id
      });
    }
  });

  context.bot.on(":forum_topic_edited", async (ctx) => {
    try {
      const topicName = ctx.update?.message?.forum_topic_edited.name;
      const chatId = ctx.chat.id;
      const topicId = ctx.update.message?.message_thread_id || 0;
      if (!topicName) throw new Error(`No topic name found`);
      logger.info(`edited topic`, topicName);
      const id = `${chatId}_${topicId}`;
      await upsertTgTopic(id, chatId, topicId, topicName);
    } catch (e) {
      logger.error(`[TOPIC EDITED ERROR]`, e);
    }
  });

  await sleep(5000);

  context.bot.start({
    allowed_updates: ["message"],
    onStart(info) {
      logger.info(`[TELEGRAM] Started bot '${info.username}' successfully!`);
    }
  });

  context.bot.catch((error) => logger.error(`[TELEGRAM] Bot error`, error));

  // start up cron jobs
  const cronJob = new CronJob(
    // "* * * * *",
    "0,15,30,45 * * * *", // every 15 minutes, check if any ballots are expiring soon
    async () => {
      if (context.bot) {
        await telegramAlertRegardingBallots(context.bot);
      }
    }
  );

  cronJob.start();

  logger.info("started telegram bot background process");
}
