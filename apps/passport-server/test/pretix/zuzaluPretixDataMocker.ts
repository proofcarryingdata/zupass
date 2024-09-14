import { ONE_HOUR_MS } from "@pcd/util";
import sample from "lodash/sample";
import { v4 as uuid } from "uuid";
import {
  ZuzaluPretixConfig,
  ZuzaluPretixOrder,
  ZuzaluPretixPosition,
  ZuzaluPretixSubevent
} from "../../src/apis/zuzaluPretixAPI";
import { logger } from "../../src/util/logger";
import { randomEmail } from "../util/util";

export interface IMockPretixData {
  config: ZuzaluPretixConfig;
  visitorSubevent: ZuzaluPretixSubevent;
  subEventsByParentEventId: Map<string, ZuzaluPretixSubevent[]>;
  ordersByEventId: Map<string, ZuzaluPretixOrder[]>;
}

export class ZuzaluPretixDataMocker {
  private autoincrementingId = 0;
  private config: ZuzaluPretixConfig;
  private mockData: IMockPretixData;

  public constructor(pretixConfig: ZuzaluPretixConfig) {
    this.config = pretixConfig;
    this.mockData = this.newMockData();
  }

  public getMockData(): IMockPretixData {
    logger("[MOCK]", JSON.stringify(this.mockData, null, 2));
    return this.mockData;
  }

  public getResidentsAndOrganizers(): ZuzaluPretixOrder[] {
    const zuzaluEventOrders =
      this.mockData.ordersByEventId.get(this.mockData.config.zuEventID) ?? [];
    return zuzaluEventOrders;
  }

  public getResidentsOrOrganizers(organizers: boolean): ZuzaluPretixOrder[] {
    return this.getResidentsAndOrganizers().filter((o) =>
      organizers
        ? o.positions[0].item === this.config.zuEventOrganizersItemID
        : o.positions[0].item !== this.config.zuEventOrganizersItemID
    );
  }

  public getVistors(): ZuzaluPretixOrder[] {
    const visitorEventOrders =
      this.mockData.ordersByEventId.get(
        this.mockData.config.zuVisitorEventID
      ) ?? [];
    return visitorEventOrders;
  }

  public updateResidentOrOrganizer(
    code: string,
    update: (order: ZuzaluPretixOrder) => void
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
    update: (order: ZuzaluPretixOrder) => void
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

  public addVisitor(): ZuzaluPretixOrder {
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

  public addResidentOrOrganizer(isOrganizer: boolean): ZuzaluPretixOrder {
    const newResident = this.newResidentOrOrganizer(isOrganizer);
    const zuzaluEventOrders =
      this.mockData.ordersByEventId.get(this.mockData.config.zuEventID) ?? [];
    zuzaluEventOrders.push(newResident);
    return newResident;
  }

  public removeResidentOrOrganizer(code: string): void {
    let zuzaluEventOrders =
      this.mockData.ordersByEventId.get(this.mockData.config.zuEventID) ?? [];
    zuzaluEventOrders = zuzaluEventOrders.filter((o) => o.code !== code);
    this.mockData.ordersByEventId.set(
      this.mockData.config.zuEventID,
      zuzaluEventOrders
    );
  }

  private newMockData(): IMockPretixData {
    const residentOrders: ZuzaluPretixOrder[] = [
      this.newResidentOrOrganizer(true),
      this.newResidentOrOrganizer(false)
    ];
    const visitorSubevent = this.newVisitorSubEvent();
    const visitorOrders = [this.newVisitor(visitorSubevent)];

    const subEventsByParentEventId: Map<string, ZuzaluPretixSubevent[]> =
      new Map();
    subEventsByParentEventId.set(this.config.zuVisitorEventID, [
      visitorSubevent
    ]);

    const ordersByEventId: Map<string, ZuzaluPretixOrder[]> = new Map();
    ordersByEventId.set(this.config.zuEventID, residentOrders);
    ordersByEventId.set(this.config.zuVisitorEventID, visitorOrders);

    return {
      config: this.config,
      subEventsByParentEventId,
      ordersByEventId,
      visitorSubevent
    };
  }

  private newVisitorSubEvent(): ZuzaluPretixSubevent {
    return {
      id: this.nextId(),
      date_from: new Date(Date.now()).toString(),
      date_to: new Date(Date.now() + ONE_HOUR_MS * 24 * 7).toString()
    };
  }

  private newVisitor(subevent: ZuzaluPretixSubevent): ZuzaluPretixOrder {
    const orderId = this.randomOrderCode();
    const email = randomEmail();

    return {
      code: orderId,
      status: "p",
      testmode: false,
      secret: "",
      email: email,
      positions: [this.newPosition(orderId, email, this.nextId(), subevent.id)]
    };
  }

  private newResidentOrOrganizer(isOrganizer: boolean): ZuzaluPretixOrder {
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
        )
      ]
    };
  }

  private newPosition(
    orderId: string,
    email: string,
    itemId: number,
    subevent: number
  ): ZuzaluPretixPosition {
    return {
      id: this.nextId(),
      order: orderId,
      positionid: this.nextId(),
      item: itemId,
      price: "",
      attendee_name: this.randomName(),
      attendee_email: email,
      subevent: subevent,
      secret: this.randomSecret()
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

  private randomSecret(): string {
    return uuid().substring(0, 8);
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
    return sample(firstNames) + " " + sample(lastNames);
  }
}
