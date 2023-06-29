import _ from "lodash";
import { v4 as uuid } from "uuid";
import {
  PretixConfig,
  PretixOrder,
  PretixPosition,
  PretixSubevent,
} from "../../src/apis/pretixAPI";
import { randomEmail } from "../util/util";

export interface IMockPretixData {
  config: PretixConfig;
  visitorSubevent: PretixSubevent;
  subEventsByParentEventId: Map<string, PretixSubevent[]>;
  ordersByEventId: Map<string, PretixOrder[]>;
}

export class ZuzaluPretixDataMocker {
  private autoincrementingId = 0;
  private config: PretixConfig;
  private mockData: IMockPretixData;

  public constructor(pretixConfig: PretixConfig) {
    this.config = pretixConfig;
    this.mockData = this.newMockData();
  }

  public getMockData(): IMockPretixData {
    return this.mockData;
  }

  public updateResidentOrOrganizer(
    code: string,
    update: (order: PretixOrder) => void
  ): void {
    const zuzaluEventOrders =
      this.mockData.ordersByEventId.get(this.mockData.config.zuEventID) ?? [];
    const order = zuzaluEventOrders.find((o) => o.code === code);
    if (!order) {
      throw new Error(`couldn't find order ${code}`);
    }
    update(order);
  }

  public updateVisitor(
    code: string,
    update: (order: PretixOrder) => void
  ): void {
    const visitorEventOrders =
      this.mockData.ordersByEventId.get(
        this.mockData.config.zuVisitorEventID
      ) ?? [];
    const order = visitorEventOrders.find((o) => o.code === code);
    if (!order) {
      throw new Error(`couldn't find order ${code}`);
    }
    update(order);
  }

  public addVisitor(): PretixOrder {
    const newVisitor = this.newVisitor(this.mockData.visitorSubevent);
    const visitorSeriesOrders =
      this.mockData.ordersByEventId.get(
        this.mockData.config.zuVisitorEventID
      ) ?? [];
    visitorSeriesOrders.push(newVisitor);
    return newVisitor;
  }

  public removeVisitor(code: string): void {
    let visitorSeriesOrders =
      this.mockData.ordersByEventId.get(
        this.mockData.config.zuVisitorEventID
      ) ?? [];
    visitorSeriesOrders = visitorSeriesOrders.filter((o) => o.code !== code);
    this.mockData.ordersByEventId.set(
      this.mockData.config.zuVisitorEventID,
      visitorSeriesOrders
    );
  }

  public addResidentOrOrganizer(isOrganizer: boolean): PretixOrder {
    const newResident = this.newResidentOrOrganizer(isOrganizer);
    const zuzaluEventOrders =
      this.mockData.ordersByEventId.get(this.mockData.config.zuEventID) ?? [];
    zuzaluEventOrders.push(newResident);
    return newResident;
  }

  public removeResident(code: string): void {
    let zuzaluEventOrders =
      this.mockData.ordersByEventId.get(this.mockData.config.zuEventID) ?? [];
    zuzaluEventOrders = zuzaluEventOrders.filter((o) => o.code !== code);
    this.mockData.ordersByEventId.set(
      this.mockData.config.zuEventID,
      zuzaluEventOrders
    );
  }

  private newMockData(): IMockPretixData {
    const residentOrders: PretixOrder[] = [
      this.newResidentOrOrganizer(true),
      this.newResidentOrOrganizer(false),
    ];
    const visitorSubevent = this.newVisitorSubEvent();
    const visitorOrders = [this.newVisitor(visitorSubevent)];

    const subEventsByParentEventId: Map<string, PretixSubevent[]> = new Map();
    subEventsByParentEventId.set(this.config.zuVisitorEventID, [
      visitorSubevent,
    ]);

    const ordersByEventId: Map<string, PretixOrder[]> = new Map();
    ordersByEventId.set(this.config.zuEventID, residentOrders);
    ordersByEventId.set(this.config.zuVisitorEventID, visitorOrders);

    return {
      config: this.config,
      subEventsByParentEventId,
      ordersByEventId,
      visitorSubevent,
    };
  }

  private newVisitorSubEvent(): PretixSubevent {
    return {
      id: this.nextId(),
      date_from: new Date(Date.now()).toString(),
      date_to: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toString(),
    };
  }

  private newVisitor(subevent: PretixSubevent): PretixOrder {
    const orderId = this.randomOrderCode();
    const email = randomEmail();

    return {
      code: orderId,
      status: "p",
      testmode: false,
      secret: "",
      email: email,
      positions: [this.newPosition(orderId, email, this.nextId(), subevent.id)],
    };
  }

  private newResidentOrOrganizer(isOrganizer: boolean): PretixOrder {
    const orderId = this.randomOrderCode();
    const email = randomEmail();

    return {
      code: orderId,
      status: "p",
      testmode: false,
      secret: "",
      email: email,
      positions: [
        this.newPosition(
          orderId,
          email,
          isOrganizer ? this.config.zuEventOrganizersItemID : this.nextId(),
          this.nextId()
        ),
      ],
    };
  }

  private newPosition(
    orderId: string,
    email: string,
    itemId: number,
    subevent: number
  ): PretixPosition {
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
    if (++this.autoincrementingId === this.config.zuEventOrganizersItemID) {
      ++this.autoincrementingId;
    }

    return this.autoincrementingId;
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
