import _ from "lodash";
import { v4 as uuid } from "uuid";
import {
  getPretixConfig,
  PretixConfig,
  PretixOrder,
  PretixPosition,
  PretixSubevent,
} from "../../src/apis/pretixAPI";
import { randomEmail } from "../util";

export interface IMockPretixData {
  config: PretixConfig;
  subEventsByParentEventId: Map<string, PretixSubevent[]>;
  ordersByEventId: Map<string, PretixOrder[]>;
}

export class ZuzaluPretixDataMocker {
  private autoincrementingId = 0;
  private config: PretixConfig;

  public constructor() {
    const config = getPretixConfig();
    if (!config) {
      throw new Error("couldn't load pretix config from environment variables");
    }
    this.config = config;
  }

  public mockData(): IMockPretixData {
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
    return uuid().substring(0, 5);
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
