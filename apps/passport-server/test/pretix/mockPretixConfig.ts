import { DevconnectPretixConfig } from "../../src/apis/devconnect/organizer";

export const EVENT_A_ID = "event-a";
export const EVENT_B_ID = "event-b";
export const EVENT_C_ID = "event-c";

export const EVENT_A_CONFIG_ID = 1;
export const EVENT_B_CONFIG_ID = 2;
export const EVENT_C_CONFIG_ID = 3;

export const EVENT_A_NAME = "Event A";
export const EVENT_B_NAME = "Event B";
export const EVENT_C_NAME = "Event C";

export const ITEM_1 = 456;
export const ITEM_2 = 123;
export const ITEM_3 = 789;

export const ORG_CONFIG_ID = 1;

export const EMAIL_1 = "email-1@test.com";
export const EMAIL_2 = "email-2@test.com";
export const EMAIL_3 = "email-3@test.com";
export const EMAIL_4 = "email-4@test.com";

export const EMAIL_QUESTION_ID = 456;

export const MOCK_PRETIX_API_CONFIG: DevconnectPretixConfig = {
  organizers: [
    {
      id: ORG_CONFIG_ID,
      orgURL: "organizer-url",
      token: "token",
      events: [
        {
          id: EVENT_A_CONFIG_ID,
          eventID: EVENT_A_ID,
          activeItemIDs: [ITEM_1.toString(), ITEM_2.toString()],
          superuserItemIds: [ITEM_2.toString()]
        },
        {
          id: EVENT_B_CONFIG_ID,
          eventID: EVENT_B_ID,
          activeItemIDs: [ITEM_3.toString()],
          superuserItemIds: [ITEM_3.toString()]
        },
        {
          id: EVENT_C_CONFIG_ID,
          eventID: EVENT_C_ID,
          activeItemIDs: [],
          superuserItemIds: []
        }
      ]
    }
  ]
};
