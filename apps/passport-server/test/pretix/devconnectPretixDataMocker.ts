import _ from "lodash";
import { v4 as uuid } from "uuid";
import {
  DevconnectPretixOrder,
  DevconnectPretixPosition,
} from "../../src/apis/devconnectPretixAPI";
import { logger } from "../../src/util/logger";

export interface IMockDevconnectPretixData {
  ordersByEventId: Map<string, DevconnectPretixOrder[]>;
  eventNameByEventID: Map<string, string>;
}

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

export const ORG_CONFIG_ID = 1;

export const EMAIL_1 = "email-1";
export const EMAIL_2 = "email-2";
export const EMAIL_3 = "email-3";
export const EMAIL_4 = "email-4";

export const EMAIL_QUESTION_ID = 456;

export class DevconnectPretixDataMocker {
  private autoincrementingId = 0;
  private mockData: IMockDevconnectPretixData;

  public constructor() {
    this.mockData = this.newMockData();
  }

  public getMockData(): IMockDevconnectPretixData {
    logger("[MOCK]", JSON.stringify(this.mockData, null, 2));
    return this.mockData;
  }

  public updateOrder(
    eventID: string,
    code: string,
    update: (order: DevconnectPretixOrder) => void
  ): void {
    const eventOrders = this.mockData.ordersByEventId.get(eventID) ?? [];
    const order = eventOrders.find((o) => o.code === code);
    if (!order) {
      throw new Error(`couldn't find order ${code}`);
    }
    update(order);
  }

  public addOrder(
    eventID: string,
    orderEmail: string,
    itemsAndEmails: [number, string | null][]
  ): DevconnectPretixOrder {
    const newOrder = this.newPretixOrder(orderEmail, itemsAndEmails);
    const eventOrders = this.mockData.ordersByEventId.get(eventID) ?? [];
    eventOrders.push(newOrder);
    return newOrder;
  }

  public removeOrder(eventID: string, code: string): void {
    let eventOrders = this.mockData.ordersByEventId.get(eventID) ?? [];
    eventOrders = eventOrders.filter((o) => o.code !== code);
    this.mockData.ordersByEventId.set(eventID, eventOrders);
  }

  private newMockData(): IMockDevconnectPretixData {
    // Share same orders across A, B, and C
    const orders: DevconnectPretixOrder[] = [
      // "Normal" one-item order -- EMAIL_4 pays for ITEM_1 with EMAIL_4 as attendee email
      this.newPretixOrder(EMAIL_4, [[ITEM_1, EMAIL_4]]),
      // Bulk order with many items testing edge cases
      this.newPretixOrder(EMAIL_1, [
        [ITEM_1, EMAIL_1],
        [ITEM_1, EMAIL_2], // prioritize attendee email over purchaser email
        [ITEM_1, EMAIL_2],
        [ITEM_1, EMAIL_3],
        [ITEM_1, null], // fall back to purchaser if attendee email is null
        [ITEM_2, EMAIL_1], // this and others below should be ignored in EVENT_A because ITEM_2 is not active
        [ITEM_2, EMAIL_1],
        [ITEM_2, EMAIL_2],
        [ITEM_2, null],
      ]),
      // Three-item order, testing ITEM_2 and override again
      this.newPretixOrder(EMAIL_2, [
        [ITEM_2, EMAIL_4],
        [ITEM_2, null],
        [ITEM_1, EMAIL_1], // should show up under EMAIL_1
      ]),
    ];

    const ordersByEventId: Map<string, DevconnectPretixOrder[]> = new Map();
    ordersByEventId.set(EVENT_A_ID, orders);
    ordersByEventId.set(EVENT_B_ID, orders);
    ordersByEventId.set(EVENT_C_ID, orders);

    const eventNameByEventID: Map<string, string> = new Map();
    eventNameByEventID.set(EVENT_A_ID, EVENT_A_NAME);
    eventNameByEventID.set(EVENT_B_ID, EVENT_B_NAME);
    eventNameByEventID.set(EVENT_C_ID, EVENT_C_NAME);

    return {
      ordersByEventId,
      eventNameByEventID,
    };
  }

  private newPretixOrder(
    orderEmail: string,
    itemsAndEmails: [number, string | null][] // array of (item, attendee email) tuples,
  ): DevconnectPretixOrder {
    const orderId = this.randomOrderCode();

    return {
      code: orderId,
      status: "p",
      testmode: false,
      secret: "",
      email: orderEmail,
      positions: itemsAndEmails.map(([item, email]) =>
        this.newPosition(orderId, email, item, this.nextId())
      ),
    };
  }

  private newPosition(
    orderId: string,
    attendeeEmail: string | null,
    itemId: number,
    subevent: number
  ): DevconnectPretixPosition {
    return {
      id: this.nextId(),
      order: orderId,
      positionid: this.nextId(),
      item: itemId,
      price: "",
      attendee_name: this.randomName(),
      attendee_email: attendeeEmail,
      subevent: subevent,
    };
  }

  private nextId(): number {
    return ++this.autoincrementingId;
  }

  private randomOrderCode(): string {
    return uuid().substring(0, 5).toUpperCase();
  }

  private randomName(): string {
    const firstNames = ["Bob", "Steve", "Gub", "Mob", "Flub", "Jib", "Grub"];
    const lastNames = [
      "Froby",
      "Shmoby",
      "Glowby",
      "Brimby",
      "Slimbo",
      "Froggy",
    ];
    return _.sample(firstNames) + " " + _.sample(lastNames);
  }
}
