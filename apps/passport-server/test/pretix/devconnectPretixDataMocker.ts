import _ from "lodash";
import { v4 as uuid } from "uuid";
import {
  DevconnectPretixOrder,
  DevconnectPretixPosition
} from "../../src/apis/devconnect/devconnectPretixAPI";
import { logger } from "../../src/util/logger";
import {
  EMAIL_1,
  EMAIL_2,
  EMAIL_3,
  EMAIL_4,
  EVENT_A_ID,
  EVENT_A_NAME,
  EVENT_B_ID,
  EVENT_B_NAME,
  EVENT_C_ID,
  EVENT_C_NAME,
  ITEM_1,
  ITEM_2,
  ITEM_3
} from "./mockPretixConfig";

export interface IMockDevconnectPretixData {
  ordersByEventId: Map<string, DevconnectPretixOrder[]>;
  eventNameByEventID: Map<string, string>;
}

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
    const eventAOrders: DevconnectPretixOrder[] = [
      this.newPretixOrder(EMAIL_4, [[ITEM_1, EMAIL_4]]),
      this.newPretixOrder(EMAIL_1, [
        [ITEM_1, EMAIL_1],
        [ITEM_1, EMAIL_2],
        [ITEM_1, EMAIL_2],
        [ITEM_1, EMAIL_3],
        [ITEM_1, null],
        [ITEM_2, EMAIL_1],
        [ITEM_2, EMAIL_1],
        [ITEM_2, EMAIL_2],
        [ITEM_2, null],
        [ITEM_3, EMAIL_2],
        [ITEM_2, EMAIL_4]
      ]),
      this.newPretixOrder(EMAIL_2, [
        [ITEM_2, EMAIL_4],
        [ITEM_2, null],
        [ITEM_1, EMAIL_1]
      ])
    ];

    const eventBOrders: DevconnectPretixOrder[] = [];
    const eventCOrders: DevconnectPretixOrder[] = [];

    const ordersByEventId: Map<string, DevconnectPretixOrder[]> = new Map();
    ordersByEventId.set(EVENT_A_ID, eventAOrders);
    ordersByEventId.set(EVENT_B_ID, eventBOrders);
    ordersByEventId.set(EVENT_C_ID, eventCOrders);

    const eventNameByEventID: Map<string, string> = new Map();
    eventNameByEventID.set(EVENT_A_ID, EVENT_A_NAME);
    eventNameByEventID.set(EVENT_B_ID, EVENT_B_NAME);
    eventNameByEventID.set(EVENT_C_ID, EVENT_C_NAME);

    return {
      ordersByEventId,
      eventNameByEventID
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
      )
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
      subevent: subevent
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
      "Froggy"
    ];
    return _.sample(firstNames) + " " + _.sample(lastNames);
  }
}
