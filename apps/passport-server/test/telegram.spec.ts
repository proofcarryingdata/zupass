import { LATEST_PRIVACY_NOTICE } from "@pcd/passport-interface";
import { randomUUID } from "@pcd/util";
import { Identity } from "@semaphore-protocol/identity";
import { expect } from "chai";
import "mocha";
import { step } from "mocha-steps";
import { Pool, PoolClient } from "postgres-pool";
import { v4 as uuid } from "uuid";
import { TelegramEvent } from "../src/database/models";
import { getDB } from "../src/database/postgresPool";
import {
  getAllOrganizers,
  insertPretixEventConfig,
  insertPretixOrganizerConfig
} from "../src/database/queries/pretix_config/insertConfiguration";
import { upsertUser } from "../src/database/queries/saveUser";
import { deleteTelegramVerification } from "../src/database/queries/telegram/deleteTelegramVerification";
import { fetchTelegramVerificationStatus } from "../src/database/queries/telegram/fetchTelegramConversation";
import {
  fetchTelegramAnonTopicsByChatId,
  fetchTelegramBotEvent,
  fetchTelegramChat,
  fetchTelegramTopicsByChatId
} from "../src/database/queries/telegram/fetchTelegramEvent";
import {
  insertTelegramChat,
  insertTelegramEvent,
  insertTelegramTopic,
  insertTelegramVerification
} from "../src/database/queries/telegram/insertTelegramConversation";
import { verifyUserEventIds } from "../src/util/telegramHelpers";
import { ITestEvent, ITestOrganizer } from "./devconnectdb.spec";
import { overrideEnvironment, testingEnv } from "./util/env";

describe("telegram bot functionality", function () {
  let pool: Pool;
  let client: PoolClient;

  this.beforeAll(async () => {
    await overrideEnvironment(testingEnv);
    pool = await getDB();
    client = await pool.connect();
  });

  this.afterAll(async () => {
    await client.release();
    await pool.end();
  });

  step("database should initialize", async function () {
    expect(client).to.not.eq(null);
  });

  const dummyUserId = 12345;
  const dummyChatId = 54321;
  const dummyChatId_1 = 654321;
  const anonChannelID = 420;
  const anonChannelID_1 = 421;

  const testOrganizers: ITestOrganizer[] = [
    {
      dbId: "",
      token: uuid(),
      organizerUrl: "https://www.example.com/0xparc-organizer",
      disabled: false
    }
  ];

  const testEvents: ITestEvent[] = [
    {
      dbEventConfigId: "",
      dbEventInfoId: "",
      dbOrganizerId: "",
      eventId: "progcrypto",
      eventName: "ProgCrypto",
      _organizerIdx: 0
    },
    {
      dbEventConfigId: "",
      dbEventInfoId: "",
      dbOrganizerId: "",
      eventId: "aw",
      eventName: "AW",
      _organizerIdx: 0
    }
  ];

  step("should be able to insert organizer configs", async function () {
    for (const organizer of testOrganizers) {
      const id = await insertPretixOrganizerConfig(
        client,
        organizer.organizerUrl,
        organizer.token,
        organizer.disabled
      );
      organizer.dbId = id;
      expect(typeof id).to.eq("string");
    }
    const allOrganizers = await getAllOrganizers(client);
    expect(allOrganizers.length).to.eq(testOrganizers.length);
  });

  step(
    "should be able to insert corresponding event_config",
    async function () {
      for (let i = 0; i < testEvents.length; i++) {
        const event = testEvents[i];
        const organizer = testOrganizers[event._organizerIdx];

        const items: string[] = [];
        const superItems: string[] = [];
        const eventConfigId = await insertPretixEventConfig(
          client,
          organizer.dbId,
          items,
          superItems,
          event.eventId
        );

        event.dbEventConfigId = eventConfigId;
        event.dbOrganizerId = organizer.dbId;

        expect(typeof event.dbEventConfigId).to.eq("string");
      }
    }
  );

  step("should be able to add a new telegram chat", async function () {
    expect(await insertTelegramChat(client, dummyChatId)).to.eq(1);
    const insertedChat = await fetchTelegramChat(client, dummyChatId);
    expect(insertedChat?.telegram_chat_id).to.eq(dummyChatId.toString());
  });

  step("should be able to record a verified user", async function () {
    // Insert a dummy user
    const newIdentity = new Identity();
    const newCommitment = newIdentity.commitment.toString();
    const uuid = await upsertUser(client, {
      uuid: randomUUID(),
      emails: ["ivan@0xparc.org"],
      commitment: newCommitment,
      terms_agreed: LATEST_PRIVACY_NOTICE,
      extra_issuance: false
    });
    if (!uuid) {
      throw new Error("expected to be able to insert a commitment");
    }

    // Insert a dummy Telegram user and chat as verified
    expect(
      await insertTelegramVerification(
        client,
        dummyUserId,
        dummyChatId,
        newCommitment
      )
    ).to.eq(1);
    // Check that the user is verified for access to the chat
    expect(
      await fetchTelegramVerificationStatus(client, dummyUserId, dummyChatId)
    ).to.be.true;
  });

  step("should be able to delete a verification", async function () {
    await deleteTelegramVerification(client, dummyUserId, dummyChatId);
    // Check that the user is no longer verified for access to the chat
    expect(
      await fetchTelegramVerificationStatus(client, dummyUserId, dummyChatId)
    ).to.be.false;
  });

  step("should be able to link an event and tg chat", async function () {
    const eventConfigId = testEvents[0].dbEventConfigId;
    await insertTelegramEvent(client, eventConfigId, dummyChatId);
    const insertedEvent = await fetchTelegramBotEvent(
      client,
      eventConfigId,
      dummyChatId
    );
    expect(insertedEvent?.ticket_event_id).to.eq(eventConfigId);
    // Note: Grammy allows chatIds to be numbers or strings
    expect(insertedEvent?.telegram_chat_id).to.eq(dummyChatId.toString());
  });

  step(
    "should be able to connect a new ticketed event with an existing chat",
    async function () {
      const newEventConfigId = testEvents[1].dbEventConfigId;

      await insertTelegramEvent(client, newEventConfigId, dummyChatId);
      const insertedEvent = await fetchTelegramBotEvent(
        client,
        newEventConfigId,
        dummyChatId
      );
      expect(insertedEvent?.ticket_event_id).to.eq(newEventConfigId);
      expect(insertedEvent?.telegram_chat_id).to.eq(dummyChatId.toString());
    }
  );

  step(
    "should be able to connect an existing ticketed event to a new chat",
    async function () {
      const eventConfigId = testEvents[0].dbEventConfigId;
      await insertTelegramChat(client, dummyChatId_1);
      await insertTelegramEvent(client, eventConfigId, dummyChatId_1);
      const insertedEvent = await fetchTelegramBotEvent(
        client,
        eventConfigId,
        dummyChatId_1
      );
      expect(insertedEvent?.ticket_event_id).to.eq(eventConfigId);
      expect(insertedEvent?.telegram_chat_id).to.eq(dummyChatId_1.toString());
    }
  );

  step(
    "should be able to update the chat a ticket refers to",
    async function () {
      const eventConfigId = testEvents[0].dbEventConfigId;
      await insertTelegramEvent(client, eventConfigId, dummyChatId);
      let insertedEventsByEventId = await fetchTelegramBotEvent(
        client,
        eventConfigId,
        dummyChatId
      );
      expect(insertedEventsByEventId?.telegram_chat_id).to.eq(
        dummyChatId.toString()
      );

      await insertTelegramEvent(client, eventConfigId, dummyChatId_1);
      insertedEventsByEventId = await fetchTelegramBotEvent(
        client,
        eventConfigId,
        dummyChatId_1
      );
      expect(insertedEventsByEventId?.telegram_chat_id).to.eq(
        dummyChatId_1.toString()
      );
    }
  );

  step(
    "fetching a telegram chat via a list of eventIds should work",
    async function () {
      const sampleChats: TelegramEvent[] = [
        {
          telegram_chat_id: 1,
          ticket_event_id: "event1"
        },
        {
          telegram_chat_id: 1,
          ticket_event_id: "event2"
        },
        {
          telegram_chat_id: 1,
          ticket_event_id: "event3"
        },
        {
          telegram_chat_id: 2,
          ticket_event_id: "event3"
        },
        {
          telegram_chat_id: 2,
          ticket_event_id: "event4"
        },
        {
          telegram_chat_id: 2,
          ticket_event_id: "event5"
        }
      ];

      const testCases = [
        {
          name: "Finds chat with matching single event ID",
          chatId: 2,
          input: ["event5"],
          expected: true
        },
        {
          name: "Finds chat with matching multiple event IDs",
          input: ["event1", "event2", "event3"],
          chatId: 1,
          expected: true
        },
        {
          name: "Handles event IDs that match different chats (should return null)",
          input: ["event3", "event4"],
          chatId: 1,
          expected: false
        },
        {
          name: "Returns multiple chats when they each link to an event",
          input: ["event3"],
          chatId: 1,
          expected: true
        },
        {
          name: "Returns multiple chats when they each link to an event",
          input: ["event3"],
          chatId: 2,
          expected: true
        },
        {
          name: "Returns null if no chat matches the event IDs",
          input: ["event6"],
          chatId: 1,
          expected: false
        },
        {
          name: "Handles empty event ID list (should return null)",
          input: [],
          chatId: 1,
          expected: false
        },
        {
          name: "Handles event IDs that partially match (should return null)",
          input: ["event1", "event4"],
          chatId: 1,
          expected: false
        }
      ];

      testCases.forEach((test) => {
        const chats = sampleChats.filter(
          (c) => c.telegram_chat_id === test.chatId
        );
        const result = verifyUserEventIds(chats, test.input);
        expect(result).to.eql(test.expected);
      });
    }
  );
  step("should be able to add multiple anon topics", async function () {
    await insertTelegramTopic(client, dummyChatId, "test", anonChannelID, true);
    const insertedAnonTopic = await fetchTelegramAnonTopicsByChatId(
      client,
      dummyChatId
    );
    expect(insertedAnonTopic[0]?.telegramChatID).to.eq(dummyChatId.toString());
    expect(insertedAnonTopic[0]?.topic_id).to.eq(anonChannelID.toString());
    expect(insertedAnonTopic[0]?.topic_name).to.eq("test");
    await insertTelegramTopic(
      client,
      dummyChatId,
      "test1",
      anonChannelID_1,
      true
    );

    const insertedAnonTopic_1 = await fetchTelegramAnonTopicsByChatId(
      client,
      dummyChatId
    );
    expect(insertedAnonTopic_1.length).to.eq(2);
    expect(insertedAnonTopic_1[1]?.telegramChatID).to.eq(
      dummyChatId.toString()
    );
    expect(insertedAnonTopic_1[1]?.topic_id).to.eq(anonChannelID_1.toString());
    expect(insertedAnonTopic_1[1]?.topic_name).to.eq("test1");
  });

  step("test empty array query", async function () {
    const badQuery = await fetchTelegramTopicsByChatId(client, 169);
    expect(badQuery.length).to.eq(0);
  });
});
