import _ from "lodash";
import { v4 as uuid } from "uuid";
import {
  GenericPretixCategory,
  GenericPretixEvent,
  GenericPretixEventSettings,
  GenericPretixItem,
  GenericPretixOrder,
  GenericPretixPosition
} from "../../src/apis/pretix/genericPretixAPI";

export interface IMockGenericPretixData {
  // aggregate data for simpler querying
  organizers: IOrganizer[];
  organizersByOrgUrl: Map<string, IOrganizer>;

  // specific data for easier testing
  organizer1: IOrganizer;
  organizer2: IOrganizer;
}

export interface IOrganizer {
  orgUrl: string;
  token: string;

  // aggregate data for simpler querying
  ordersByEventID: Map<string, GenericPretixOrder[]>;
  eventByEventID: Map<string, GenericPretixEvent>;
  itemsByEventID: Map<string, GenericPretixItem[]>;
  settingsByEventID: Map<string, GenericPretixEventSettings>;
  categoriesByEventId: Map<string, GenericPretixCategory[]>;

  // specific data for easier testing
  eventAItem1: GenericPretixItem;
  eventAItem2: GenericPretixItem;
  eventBItem3: GenericPretixItem;
  eventBItem4: GenericPretixItem;

  eventA: GenericPretixEvent;
  eventB: GenericPretixEvent;
  eventC: GenericPretixEvent;

  eventASettings: GenericPretixEventSettings;
  eventBSettings: GenericPretixEventSettings;
  eventCSettings: GenericPretixEventSettings;

  EMAIL_1: string;
  EMAIL_2: string;
  EMAIL_3: string;
  EMAIL_4: string;
}

export class GenericPretixDataMocker {
  private autoincrementingId = 10_000;
  private mockData: IMockGenericPretixData;

  public constructor() {
    this.mockData = this.newMockData();
  }

  public backup(): IMockGenericPretixData {
    return structuredClone(this.mockData);
  }

  public restore(data: IMockGenericPretixData): void {
    this.mockData = data;
  }

  public get(): IMockGenericPretixData {
    return this.mockData;
  }

  public getOrgByUrl(orgUrl: string): IOrganizer {
    const org = this.get().organizersByOrgUrl.get(orgUrl);
    if (!org) {
      throw new Error(`Could not find organizer for ${orgUrl}`);
    }
    return org;
  }

  public updateOrder(
    orgUrl: string,
    eventID: string,
    code: string,
    update: (order: GenericPretixOrder) => void
  ): void {
    const org = this.mockData.organizersByOrgUrl.get(orgUrl);
    if (!org) throw new Error(`missing org ${orgUrl}`);
    const eventOrders = org.ordersByEventID.get(eventID) ?? [];
    const order = eventOrders.find((o) => o.code === code);
    if (!order) {
      throw new Error(`couldn't find order ${code}`);
    }
    update(order);
  }

  public updatePositionBySecret(
    orgUrl: string,
    secret: string,
    update: (position: GenericPretixPosition) => void
  ): void {
    const org = this.mockData.organizersByOrgUrl.get(orgUrl);
    if (!org) throw new Error(`missing org ${orgUrl}`);

    for (const order of [...org.ordersByEventID.values()].flat()) {
      const position = order.positions.find(
        (position) => position.secret === secret
      );
      if (position) {
        update(position);
        return;
      }
    }
  }

  public removeOrder(orgUrl: string, eventID: string, code: string): void {
    const org = this.mockData.organizersByOrgUrl.get(orgUrl);
    if (!org) throw new Error(`missing org ${orgUrl}`);
    let eventOrders = org.ordersByEventID.get(eventID) ?? [];
    eventOrders = eventOrders.filter((o) => o.code !== code);
    org.ordersByEventID.set(eventID, eventOrders);
  }

  public removeEventItem(orgUrl: string, eventID: string, id: number): void {
    const org = this.mockData.organizersByOrgUrl.get(orgUrl);
    if (!org) throw new Error(`missing org ${orgUrl}`);

    let eventItems = org.itemsByEventID.get(eventID) ?? [];
    eventItems = eventItems.filter((item) => item.id !== id);
    org.itemsByEventID.set(eventID, eventItems);
  }

  public updateEvent(
    orgUrl: string,
    eventID: string,
    update: (event: GenericPretixEvent) => void
  ): void {
    const org = this.mockData.organizersByOrgUrl.get(orgUrl);
    if (!org) throw new Error(`missing org ${orgUrl}`);
    const event = org.eventByEventID.get(eventID);
    if (!event) {
      throw new Error(`couldn't find event ${eventID}`);
    }
    update(event);
  }

  public getEventSettings(
    orgUrl: string,
    eventID: string
  ): GenericPretixEventSettings {
    const org = this.mockData.organizersByOrgUrl.get(orgUrl);
    if (!org) throw new Error(`missing org ${orgUrl}`);
    if (!org.settingsByEventID.has(eventID)) {
      throw new Error(`missing settings for ${eventID}`);
    }
    return org.settingsByEventID.get(eventID) as GenericPretixEventSettings;
  }

  public setEventSettings(
    orgUrl: string,
    eventID: string,
    settings: GenericPretixEventSettings
  ): void {
    const org = this.mockData.organizersByOrgUrl.get(orgUrl);
    if (!org) throw new Error(`missing org ${orgUrl}`);
    org.settingsByEventID.set(eventID, settings);
  }

  public updateItem(
    orgUrl: string,
    eventID: string,
    itemId: number,
    update: (order: GenericPretixItem) => void
  ): void {
    const org = this.mockData.organizersByOrgUrl.get(orgUrl);
    if (!org) throw new Error(`missing org ${orgUrl}`);
    const eventItems = org.itemsByEventID.get(eventID) ?? [];
    const item = eventItems.find((item) => item.id === itemId);
    if (!item) {
      throw new Error(`couldn't find item ${itemId} for event ${eventID}`);
    }
    update(item);
  }

  private newMockData(): IMockGenericPretixData {
    const organizer1 = this.newOrganizer();
    const organizer2 = this.newOrganizer();

    const organizersByOrgUrl: Map<string, IOrganizer> = new Map();
    organizersByOrgUrl.set(organizer1.orgUrl, organizer1);
    organizersByOrgUrl.set(organizer2.orgUrl, organizer2);

    return {
      organizers: [organizer1, organizer2],
      organizersByOrgUrl: organizersByOrgUrl,
      organizer2,
      organizer1
    };
  }

  private newOrganizer(): IOrganizer {
    const orgUrl = `https://www.${uuid()}.com`;
    const token = uuid();

    const EMAIL_1 = "email-1@test.com";
    const EMAIL_2 = "email-2@test.com";
    const EMAIL_3 = "email-3@test.com";
    const EMAIL_4 = "email-4@test.com";

    const eventA = this.newEvent("Event A", "event-a");
    const eventB = this.newEvent("Event B", "event-b");
    const eventC = this.newEvent("Event C", "event-c");

    const eventASettings = this.newEventSettings();
    const eventBSettings = this.newEventSettings();
    const eventCSettings = this.newEventSettings();

    const eventACategories = [1, 2, 3].map((n) =>
      this.newEventCategory(n, false)
    );
    const eventBCategories = [
      this.newEventCategory(1, false),
      this.newEventCategory(2, true)
    ];
    const eventCCategories = [1, 2].map((n) => this.newEventCategory(n, false));

    const eventAItem1 = this.newItem("item-1", 1);
    const eventAItem2 = this.newItem("item-2", 1);
    const eventBItem3 = this.newItem("item-3", 1);
    // Add-on item
    const eventBItem4 = this.newItem("item-4", 2, true);

    const eventAOrders: GenericPretixOrder[] = [
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

    const eventBOrders: GenericPretixOrder[] = [];
    const eventCOrders: GenericPretixOrder[] = [];

    const ordersByEventID: Map<string, GenericPretixOrder[]> = new Map();
    ordersByEventID.set(eventA.slug, eventAOrders);
    ordersByEventID.set(eventB.slug, eventBOrders);
    ordersByEventID.set(eventC.slug, eventCOrders);

    const eventNameByEventID: Map<string, GenericPretixEvent> = new Map();
    eventNameByEventID.set(eventA.slug, eventA);
    eventNameByEventID.set(eventB.slug, eventB);
    eventNameByEventID.set(eventC.slug, eventC);

    const itemsByEventID: Map<string, GenericPretixItem[]> = new Map();
    itemsByEventID.set(eventA.slug, [eventAItem1, eventAItem2]);
    itemsByEventID.set(eventB.slug, [eventBItem3, eventBItem4]);

    const settingsByEventID: Map<string, GenericPretixEventSettings> =
      new Map();
    settingsByEventID.set(eventA.slug, eventASettings);
    settingsByEventID.set(eventB.slug, eventBSettings);
    settingsByEventID.set(eventC.slug, eventCSettings);

    const categoriesByEventId: Map<string, GenericPretixCategory[]> = new Map();
    categoriesByEventId.set(eventA.slug, eventACategories);
    categoriesByEventId.set(eventB.slug, eventBCategories);
    categoriesByEventId.set(eventC.slug, eventCCategories);

    return {
      orgUrl,
      token,
      ordersByEventID,
      eventByEventID: eventNameByEventID,
      itemsByEventID,
      settingsByEventID,
      eventAItem1,
      eventAItem2,
      eventBItem3,
      eventBItem4,
      eventA,
      eventB,
      eventC,
      eventASettings,
      eventBSettings,
      eventCSettings,
      categoriesByEventId,
      EMAIL_1,
      EMAIL_2,
      EMAIL_3,
      EMAIL_4
    };
  }

  private newEvent(name: string, slug: string): GenericPretixEvent {
    return {
      name: { en: name },
      slug
    };
  }

  private newItem(
    name: string,
    category: number,
    addon = false
  ): GenericPretixItem {
    return {
      id: this.nextId(),
      name: { en: name },
      category,
      admission: !addon,
      personalized: !addon
    };
  }

  private newPretixOrder(
    orderEmail: string,
    itemsAndEmails: [number, string | null][] // array of (item, attendee email) tuples,
  ): GenericPretixOrder {
    const orderId = this.randomOrderCode();

    return {
      code: orderId,
      name: this.randomName(),
      status: "p",
      testmode: false,
      secret: this.randomSecret(),
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
  ): GenericPretixPosition {
    return {
      id: this.nextId(),
      order: orderId,
      positionid: this.nextId(),
      item: itemId,
      price: "",
      attendee_name: this.randomName(),
      attendee_email: attendeeEmail,
      subevent: subevent,
      secret: this.randomSecret(),
      checkins: []
    };
  }

  private newEventSettings(): GenericPretixEventSettings {
    return {
      attendee_emails_asked: true,
      attendee_emails_required: true
    };
  }

  private newEventCategory(
    id: number,
    isAddon: boolean
  ): GenericPretixCategory {
    return {
      id,
      is_addon: isAddon
    };
  }

  private nextId(): number {
    return ++this.autoincrementingId;
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
    return _.sample(firstNames) + " " + _.sample(lastNames);
  }
}
