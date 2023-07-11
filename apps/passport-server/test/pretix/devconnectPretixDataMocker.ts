import _ from "lodash";
import { v4 as uuid } from "uuid";
import {
  DevconnectPretixOrder,
  DevconnectPretixPosition,
} from "../../src/apis/devconnectPretixAPI";
import { logger } from "../../src/util/logger";
import { randomEmail } from "../util/util";

export interface IMockDevconnectPretixData {
  ordersByEventId: Map<string, DevconnectPretixOrder[]>;
}

export const EVENT_A = "event-a";
export const EVENT_B = "event-b";
export const EVENT_C = "event-c";

export const ITEM_1 = 1;
export const ITEM_2 = 2;

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

  public addOrder(eventID: string, itemID: number): DevconnectPretixOrder {
    const newOrder = this.newPretixOrder(itemID);
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
    const ordersEventA: DevconnectPretixOrder[] = [
      this.newPretixOrder(ITEM_1),
      this.newPretixOrder(ITEM_2),
    ];

    const ordersEventB: DevconnectPretixOrder[] = [
      this.newPretixOrder(ITEM_1),
      this.newPretixOrder(ITEM_2),
      this.newPretixOrder(ITEM_2),
    ];

    const ordersEventC: DevconnectPretixOrder[] = [];

    const ordersByEventId: Map<string, DevconnectPretixOrder[]> = new Map();
    ordersByEventId.set(EVENT_A, ordersEventA);
    ordersByEventId.set(EVENT_B, ordersEventB);
    ordersByEventId.set(EVENT_C, ordersEventC);

    return {
      ordersByEventId,
    };
  }

  private newPretixOrder(item: number): DevconnectPretixOrder {
    const orderId = this.randomOrderCode();
    const email = randomEmail();

    return {
      code: orderId,
      status: "p",
      testmode: false,
      secret: "",
      email: email,
      positions: [this.newPosition(orderId, email, item, this.nextId())],
    };
  }

  private newPosition(
    orderId: string,
    email: string,
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
      attendee_email: email,
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
