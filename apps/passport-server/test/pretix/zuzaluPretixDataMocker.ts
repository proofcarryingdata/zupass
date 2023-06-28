import { v4 as uuid } from "uuid";
import {
  PretixOrder,
  PretixPosition,
  PretixSubevent,
} from "../../src/apis/pretixAPI";
import { randomEmail } from "../util";

interface IMockPretixData {
  subEventsByParentEventId: Map<string, PretixSubevent[]>;
  ordersByEventId: Map<string, PretixOrder[]>;
}

export class ZuzaluPretixDataMocker {
  private autoincrementingId = 0;
  /**
   * Event containing all zuzalu residents and organizers
   */
  private zuEventId = "zuzalu-event-id";
  /**
   * Event series containing all visitor events - one per week
   */
  private zuVisitorEventId = "zuzalu-visitors-event-id";
  private organizersItemId: number;

  public constructor() {
    this.organizersItemId = this.nextId();
  }

  mockData(): IMockPretixData {
    const residentOrders: PretixOrder[] = [
      this.newResidentOrOrganizer(true),
      this.newResidentOrOrganizer(false),
    ];
    const visitorSubevent = this.newVisitorSubEvent();
    const visitorOrders = [this.newVisitor(visitorSubevent)];

    const subEventsByParentEventId: Map<string, PretixSubevent[]> = new Map();
    subEventsByParentEventId.set(this.zuVisitorEventId, [visitorSubevent]);

    const ordersByEventId: Map<string, PretixOrder[]> = new Map();
    ordersByEventId.set(this.zuEventId, residentOrders);
    ordersByEventId.set(this.zuVisitorEventId, visitorOrders);

    return {
      subEventsByParentEventId,
      ordersByEventId,
    };
  }

  newVisitorSubEvent(): PretixSubevent {
    return {
      id: this.nextId(),
      date_from: new Date(Date.now()).toString(),
      date_to: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toString(),
    };
  }

  newVisitor(subevent: PretixSubevent): PretixOrder {
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

  newResidentOrOrganizer(isOrganizer: boolean): PretixOrder {
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
          isOrganizer ? this.organizersItemId : this.nextId(),
          this.nextId()
        ),
      ],
    };
  }

  newPosition(
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
      attendee_name: "bob bobly",
      attendee_email: email,
      subevent: subevent,
    };
  }

  nextId(): number {
    return this.autoincrementingId++;
  }

  randomOrderCode(): string {
    return uuid().substring(0, 5);
  }
}
