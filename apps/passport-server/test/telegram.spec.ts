import { expect } from "chai";
import "mocha";
import { step } from "mocha-steps";
import { Pool } from "postgres-pool";
import { v4 as uuid } from "uuid";
import { getDB } from "../src/database/postgresPool";
import {
  getAllOrganizers,
  insertPretixEventConfig,
  insertPretixOrganizerConfig
} from "../src/database/queries/pretix_config/insertConfiguration";
import { deleteTelegramVerification } from "../src/database/queries/telegram/deleteTelegramVerification";
import { fetchTelegramVerificationStatus } from "../src/database/queries/telegram/fetchTelegramConversation";
import { fetchTelegramEventByEventId } from "../src/database/queries/telegram/fetchTelegramEvent";
import {
  insertTelegramEvent,
  insertTelegramVerification
} from "../src/database/queries/telegram/insertTelegramConversation";
import { ITestEvent, ITestOrganizer } from "./devconnectdb.spec";
import { overrideEnvironment, testingEnv } from "./util/env";

describe("telegram bot functionality", function () {
  this.timeout(15_000);

  let db: Pool;

  this.beforeAll(async () => {
    await overrideEnvironment(testingEnv);
    db = await getDB();
  });

  this.afterAll(async () => {
    await db.end();
  });

  step("database should initialize", async function () {
    expect(db).to.not.eq(null);
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
      organizerUrl: "https://www.example.com/0xparc-organizer"
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
        db,
        organizer.organizerUrl,
        organizer.token
      );
      organizer.dbId = id;
      expect(typeof id).to.eq("string");
    }
    const allOrganizers = await getAllOrganizers(db);
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
          db,
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

  step("should be able to record a verified user", async function () {
    // Insert a dummy Telegram user and chat as verified
    expect(
      await insertTelegramVerification(db, dummyUserId, dummyChatId)
    ).to.eq(1);
    // Check that the user is verified for access to the chat
    expect(await fetchTelegramVerificationStatus(db, dummyUserId, dummyChatId))
      .to.be.true;
  });

  step("should be able to delete a verification", async function () {
    await deleteTelegramVerification(db, dummyUserId, dummyChatId);
    // Check that the user is no longer verified for access to the chat
    expect(await fetchTelegramVerificationStatus(db, dummyUserId, dummyChatId))
      .to.be.false;
  });

  step(
    "should be able to update the chat a ticket refers to",
    async function () {
      const eventConfigId = testEvents[0].dbEventConfigId;
      await insertTelegramEvent(db, eventConfigId, dummyChatId, anonChannelID);
      let insertedEventsByEventId = await fetchTelegramEventByEventId(
        db,
        eventConfigId
      );
      expect(insertedEventsByEventId?.telegram_chat_id).to.eq(
        dummyChatId.toString()
      );

      await insertTelegramEvent(
        db,
        eventConfigId,
        dummyChatId_1,
        anonChannelID
      );
      insertedEventsByEventId = await fetchTelegramEventByEventId(
        db,
        eventConfigId
      );
      expect(insertedEventsByEventId?.telegram_chat_id).to.eq(
        dummyChatId_1.toString()
      );
    }
  );

  step("should be able to link an event and tg chat", async function () {
    const eventConfigId = testEvents[0].dbEventConfigId;
    await insertTelegramEvent(db, eventConfigId, dummyChatId, anonChannelID);
    const insertedEvent = await fetchTelegramEventByEventId(db, eventConfigId);
    expect(insertedEvent?.ticket_event_id).to.eq(eventConfigId);
    // Note: Grammy allows chatIds to be numbers or strings
    expect(insertedEvent?.telegram_chat_id).to.eq(dummyChatId.toString());
  });

  step(
    "should be able to connect a chat to a new ticketed event",
    async function () {
      const eventConfigId = testEvents[1].dbEventConfigId;

      await insertTelegramEvent(db, eventConfigId, dummyChatId, anonChannelID);
      const insertedEvent = await fetchTelegramEventByEventId(
        db,
        eventConfigId
      );
      expect(insertedEvent?.ticket_event_id).to.eq(eventConfigId);
      expect(insertedEvent?.telegram_chat_id).to.eq(dummyChatId.toString());
      expect(insertedEvent?.anon_chat_id).to.eq(anonChannelID.toString());
    }
  );

  step(
    "should be able to connect a ticketed event to a new chat",
    async function () {
      const eventConfigId = testEvents[0].dbEventConfigId;
      await insertTelegramEvent(
        db,
        eventConfigId,
        dummyChatId_1,
        anonChannelID
      );
      const insertedEvent = await fetchTelegramEventByEventId(
        db,
        eventConfigId
      );
      expect(insertedEvent?.ticket_event_id).to.eq(eventConfigId);
      expect(insertedEvent?.telegram_chat_id).to.eq(dummyChatId_1.toString());
      expect(insertedEvent?.anon_chat_id).to.eq(anonChannelID.toString());
    }
  );

  step(
    "should be able to update a chat to a new anon channel",
    async function () {
      const eventConfigId = testEvents[0].dbEventConfigId;
      await insertTelegramEvent(
        db,
        eventConfigId,
        dummyChatId,
        anonChannelID_1
      );
      const insertedEvent = await fetchTelegramEventByEventId(
        db,
        eventConfigId
      );
      expect(insertedEvent?.ticket_event_id).to.eq(eventConfigId);
      expect(insertedEvent?.telegram_chat_id).to.eq(dummyChatId.toString());
      expect(insertedEvent?.anon_chat_id).to.eq(anonChannelID_1.toString());
    }
  );
});
