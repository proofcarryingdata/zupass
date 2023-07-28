import _ from "lodash";
import { v4 as uuid } from "uuid";
import {
  DevconnectPretixItem,
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
  EVENT_C_NAME
} from "./mockPretixConfig";

export interface IMockDevconnectPretixData {
  ordersByEventID: Map<string, DevconnectPretixOrder[]>;
  eventNameByEventID: Map<string, string>;
  itemsByEventID: Map<string, DevconnectPretixItem[]>;
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
    const eventOrders = this.mockData.ordersByEventID.get(eventID) ?? [];
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
    const eventOrders = this.mockData.ordersByEventID.get(eventID) ?? [];
    eventOrders.push(newOrder);
    return newOrder;
  }

  public removeOrder(eventID: string, code: string): void {
    let eventOrders = this.mockData.ordersByEventID.get(eventID) ?? [];
    eventOrders = eventOrders.filter((o) => o.code !== code);
    this.mockData.ordersByEventID.set(eventID, eventOrders);
  }

  private newMockData(): IMockDevconnectPretixData {
    const eventAItem1 = this.newItem("item-1");
    const eventAItem2 = this.newItem("item-2");
    const eventBItem3 = this.newItem("item-3");

    const eventAOrders: DevconnectPretixOrder[] = [
      this.newPretixOrder(EMAIL_4, [[eventAItem1.id, EMAIL_4]]),
      this.newPretixOrder(EMAIL_1, [
        [eventAItem1.id, EMAIL_1],
        [eventAItem1.id, EMAIL_2],
        [eventAItem1.id, EMAIL_2],
        [eventAItem1.id, EMAIL_3],
        [eventAItem1.id, null],
        [eventAItem2.id, EMAIL_1],
        [eventAItem2.id, EMAIL_1],
        [eventAItem2.id, EMAIL_2],
        [eventAItem2.id, null],
        [eventBItem3.id, EMAIL_2],
        [eventAItem2.id, EMAIL_4]
      ]),
      this.newPretixOrder(EMAIL_2, [
        [eventAItem2.id, EMAIL_4],
        [eventAItem2.id, null],
        [eventAItem1.id, EMAIL_1]
      ])
    ];

    const eventBOrders: DevconnectPretixOrder[] = [];
    const eventCOrders: DevconnectPretixOrder[] = [];

    const ordersByEventID: Map<string, DevconnectPretixOrder[]> = new Map();
    ordersByEventID.set(EVENT_A_ID, eventAOrders);
    ordersByEventID.set(EVENT_B_ID, eventBOrders);
    ordersByEventID.set(EVENT_C_ID, eventCOrders);

    const eventNameByEventID: Map<string, string> = new Map();
    eventNameByEventID.set(EVENT_A_ID, EVENT_A_NAME);
    eventNameByEventID.set(EVENT_B_ID, EVENT_B_NAME);
    eventNameByEventID.set(EVENT_C_ID, EVENT_C_NAME);

    const itemsByEventID: Map<string, DevconnectPretixItem[]> = new Map();
    itemsByEventID.set(EVENT_A_ID, [eventAItem1, eventAItem2]);
    itemsByEventID.set(EVENT_B_ID, [eventBItem3]);

    return {
      ordersByEventID,
      eventNameByEventID,
      itemsByEventID
    };
  }

  private newItem(name: string): DevconnectPretixItem {
    return {
      id: this.nextId(),
      name: { en: name }
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
