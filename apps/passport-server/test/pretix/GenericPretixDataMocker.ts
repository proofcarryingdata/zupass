import {
  GenericPretixAnswer,
  GenericPretixEvent,
  GenericPretixEventSettings,
  GenericPretixOrder,
  GenericPretixPosition,
  GenericPretixProduct,
  GenericPretixProductCategory
} from "@pcd/passport-interface";
import { v4 as uuid } from "uuid";
import { randomName } from "../util/util";

export const NAME_QUESTION_IDENTIFIER = "name";

export interface IMockZuboxPretixBackendData {
  // aggregate data for simpler querying
  organizers: IOrganizer[];
  organizersByOrgUrl: Map<string, IOrganizer>;

  // specific data for easier testing
  ethLatAmOrganizer: IOrganizer;
  // TODO: test multi-organizer scenarios better
  // ethBerlinOrganizer: IOrganizer;
}

export interface IOrganizer {
  orgUrl: string;
  token: string;

  // eth latam setup type

  ethLatAm: GenericPretixEvent;
  ethLatAmSettings: GenericPretixEventSettings;

  ethLatAmAttendeeProduct: GenericPretixProduct;
  ethLatAmBouncerProduct: GenericPretixProduct;
  ethLatAmTShirtProduct: GenericPretixProduct;

  ethLatAmAttendeeEmail: string;
  ethLatAmBouncerEmail: string;

  ethLatAmAttendeeName: string;
  ethLatAmBouncerName: string;

  // eth berlin setup type

  ethBerlin: GenericPretixEvent;
  ethBerlinSettings: GenericPretixEventSettings;
  ethBerlinAttendeeProduct: GenericPretixProduct;
  ethBerlinBouncerProduct: GenericPretixProduct;
  ethBerlinTshirtProduct: GenericPretixProduct;

  // TODO:
  // ethBerlinAttendeeEmail: string;
  // ethBerlinBouncerEmail: string;

  // in the future - other setup types?
  // ...
  // ...

  // aggregate data for simpler querying

  ordersByEventID: Map<string, GenericPretixOrder[]>;
  eventsByEventID: Map<string, GenericPretixEvent>;
  productsByEventID: Map<string, GenericPretixProduct[]>;
  settingsByEventID: Map<string, GenericPretixEventSettings>;
  productCategoriesByEventID: Map<string, GenericPretixProductCategory[]>;
}

export class GenericPretixDataMocker {
  private autoincrementingId = 123_456_789;
  private data: IMockZuboxPretixBackendData;

  public constructor() {
    this.data = this.newMockData();
  }

  public backup(): IMockZuboxPretixBackendData {
    return structuredClone(this.data);
  }

  public restore(data: IMockZuboxPretixBackendData): void {
    this.data = data;
  }

  public get(): IMockZuboxPretixBackendData {
    return this.data;
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
    orderCode: string,
    update: (order: GenericPretixOrder) => void
  ): void {
    const org = this.data.organizersByOrgUrl.get(orgUrl);
    if (!org) throw new Error(`missing org ${orgUrl}`);
    const eventOrders = org.ordersByEventID.get(eventID) ?? [];
    const order = eventOrders.find((o) => o.code === orderCode);
    if (!order) {
      throw new Error(`couldn't find order ${orderCode}`);
    }
    update(order);
  }

  /**
   * A position corresponds to a 'ticket' on our end. A Pretix order
   * can have many positions - different tickets issued to potentially
   * multiple different attendee types and emails
   */
  public updatePositionBySecret(
    orgUrl: string,
    positionSecret: string,
    update: (position: GenericPretixPosition) => void
  ): void {
    const org = this.data.organizersByOrgUrl.get(orgUrl);
    if (!org) throw new Error(`missing org ${orgUrl}`);

    for (const order of [...org.ordersByEventID.values()].flat()) {
      const position = order.positions.find(
        (position) => position.secret === positionSecret
      );
      if (position) {
        update(position);
        return;
      }
    }
  }

  public removeOrder(orgUrl: string, eventID: string, orderCode: string): void {
    const org = this.data.organizersByOrgUrl.get(orgUrl);
    if (!org) throw new Error(`missing org ${orgUrl}`);
    let eventOrders = org.ordersByEventID.get(eventID) ?? [];
    eventOrders = eventOrders.filter((o) => o.code !== orderCode);
    org.ordersByEventID.set(eventID, eventOrders);
  }

  public removeProductType(orgUrl: string, eventID: string, id: number): void {
    const org = this.data.organizersByOrgUrl.get(orgUrl);
    if (!org) throw new Error(`missing org ${orgUrl}`);

    let eventItems = org.productsByEventID.get(eventID) ?? [];
    eventItems = eventItems.filter((item) => item.id !== id);
    org.productsByEventID.set(eventID, eventItems);
  }

  public updateEvent(
    orgUrl: string,
    eventID: string,
    update: (event: GenericPretixEvent) => void
  ): void {
    const org = this.data.organizersByOrgUrl.get(orgUrl);
    if (!org) throw new Error(`missing org ${orgUrl}`);
    const event = org.eventsByEventID.get(eventID);
    if (!event) {
      throw new Error(`couldn't find event ${eventID}`);
    }
    update(event);
  }

  public getEventSettings(
    orgUrl: string,
    eventID: string
  ): GenericPretixEventSettings {
    const org = this.data.organizersByOrgUrl.get(orgUrl);
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
    const org = this.data.organizersByOrgUrl.get(orgUrl);
    if (!org) throw new Error(`missing org ${orgUrl}`);
    org.settingsByEventID.set(eventID, settings);
  }

  public updateProduct(
    orgUrl: string,
    eventID: string,
    productId: number,
    update: (order: GenericPretixProduct) => void
  ): void {
    const org = this.data.organizersByOrgUrl.get(orgUrl);
    if (!org) throw new Error(`missing org ${orgUrl}`);
    const eventProducts = org.productsByEventID.get(eventID) ?? [];
    const product = eventProducts.find((item) => item.id === productId);
    if (!product) {
      throw new Error(`couldn't find item ${productId} for event ${eventID}`);
    }
    update(product);
  }

  /**
   * Simulates the effect of a ticket-holder being checked out (or, more
   * precisely, their check-in being deleted) on the Pretix back-end.
   */
  public checkOut(orgUrl: string, eventId: string, email: string): void {
    const org = this.data.organizersByOrgUrl.get(orgUrl);
    if (!org) throw new Error(`missing org ${orgUrl}`);
    const order = org.ordersByEventID
      .get(eventId)
      ?.find((order) => order.email === email);
    if (!order) {
      throw new Error(
        `Couldn't find an order for ${email} for event ${eventId}`
      );
    }
    if (order) {
      order.positions.forEach((position) => {
        // This simulates the results we would see for a cancelled check-in
        position.checkins = [];
      });
    }
  }

  private newMockData(): IMockZuboxPretixBackendData {
    const organizer1 = this.newOrganizer("PRETIX_ORGANIZER_ONE");
    // const organizer2 = this.newOrganizer("PRETIX_ORGANIZER_TWO");

    const organizersByOrgUrl = new Map<string, IOrganizer>();
    organizersByOrgUrl.set(organizer1.orgUrl, organizer1);
    // organizersByOrgUrl.set(organizer2.orgUrl, organizer2);

    return {
      organizers: [organizer1],
      organizersByOrgUrl: organizersByOrgUrl,
      ethLatAmOrganizer: organizer1
    };
  }

  /**
   * Note to self: we don't test multi-organizer scenarios very thoroughly.
   */
  private newOrganizer(name: string): IOrganizer {
    const orgUrl = `https://www.${name}.com`;
    const token = uuid();

    const ethLatAmAttendeeEmail = `attendee-1-${name}@test.com`
      .toLowerCase()
      .trim();
    const ethLatAmAttendeeName = randomName();

    const ethLatAmBouncerEmail = `bouncer-1${name}@test.com`
      .toLowerCase()
      .trim();
    const ethLatAmBouncerName = randomName();

    const ethLatAm = this.newEvent("ethLatAm", "eth-lat-am");
    const ethBerlin = this.newEvent("eth-berlin", "eth-berlin");

    // TODO: @richard @rob @josh - what settings should we lock in for Eth LatAm and Eth Berlin?
    const ethLatAmSettings = this.newEventSettings();
    const ethBerlinSettings = this.newEventSettings();

    // TODO: @richard / @rob - what categories are relevant for each event?
    const ticketCategory = this.nextId();
    const addonCategory = this.nextId();
    const ethLatAmCategories = [
      this.newProductCategory(ticketCategory, { is_addon: false }),
      this.newProductCategory(addonCategory, { is_addon: true })
    ];

    const ethBerlinCategories = [
      this.newProductCategory(ticketCategory, { is_addon: false }),
      this.newProductCategory(addonCategory, { is_addon: true })
    ];

    const ethLatAmAttendeeProduct = this.newProductType(
      "eth-latam-attendee-product",
      ticketCategory
    );
    const ethLatAmBouncerProduct = this.newProductType(
      "eth-lat-am-bouncer-product",
      ticketCategory
    );
    // Add-on Product - e.g. t-shirt or towel
    const ethLatAmTShirtProduct = this.newProductType(
      "eth-latam-t-shirt-product",
      addonCategory,
      {
        is_addon: true
      }
    );
    const ethBerlinAttendeeProduct = this.newProductType(
      "eth-berlin-attendee-product",
      ticketCategory
    );
    const ethBerlinBouncerProduct = this.newProductType(
      "eth-berlin-bouncer-product",
      ticketCategory
    );
    // Add-on Product - e.g. t-shirt or towel
    const ethBerlinTshirtProduct = this.newProductType(
      "eth-berlin-t-shirt-product",
      addonCategory,
      {
        is_addon: true
      }
    );

    const ethLatAmOrders: GenericPretixOrder[] = [
      this.newOrder(ethLatAmAttendeeEmail, ethLatAmAttendeeName, [
        [
          ethLatAmAttendeeProduct.id,
          ethLatAmAttendeeEmail,
          "", // Name left empty, question-answer name will be used instead
          [
            {
              question: 1,
              answer: ethLatAmAttendeeName,
              question_identifier: NAME_QUESTION_IDENTIFIER,
              options: [],
              option_identifiers: []
            }
          ]
        ]
      ]),

      this.newOrder(ethLatAmBouncerEmail, ethLatAmBouncerName, [
        [
          ethLatAmBouncerProduct.id,
          ethLatAmBouncerEmail,
          "", // Name left empty, question-answer name will be used instead
          [
            {
              question: 1,
              answer: ethLatAmBouncerName,
              question_identifier: NAME_QUESTION_IDENTIFIER,
              options: [],
              option_identifiers: []
            }
          ]
        ]
      ])

      // TODO: more orders and positions
    ];

    // TODO: model some example orders once we get further along with the
    // EthBerlin account.
    const ethBerlinOrders: GenericPretixOrder[] = [];

    const ordersByEventID = new Map<string, GenericPretixOrder[]>();
    ordersByEventID.set(ethLatAm.slug, ethLatAmOrders);
    ordersByEventID.set(ethBerlin.slug, ethBerlinOrders);

    const eventsByEventID = new Map<string, GenericPretixEvent>();
    eventsByEventID.set(ethLatAm.slug, ethLatAm);
    eventsByEventID.set(ethBerlin.slug, ethBerlin);

    const productsByEventID = new Map<string, GenericPretixProduct[]>();
    productsByEventID.set(ethLatAm.slug, [
      ethLatAmAttendeeProduct,
      ethLatAmBouncerProduct,
      ethLatAmTShirtProduct
    ]);
    productsByEventID.set(ethBerlin.slug, [
      ethBerlinAttendeeProduct,
      ethBerlinTshirtProduct,
      ethLatAmTShirtProduct
    ]);

    const settingsByEventID = new Map<string, GenericPretixEventSettings>();
    settingsByEventID.set(ethLatAm.slug, ethLatAmSettings);
    settingsByEventID.set(ethBerlin.slug, ethBerlinSettings);
    const productCategoriesByEventID = new Map<
      string,
      GenericPretixProductCategory[]
    >();
    productCategoriesByEventID.set(ethLatAm.slug, ethLatAmCategories);
    productCategoriesByEventID.set(ethBerlin.slug, ethBerlinCategories);

    return {
      ethLatAm,
      ethLatAmSettings,
      ethLatAmAttendeeProduct,
      ethLatAmBouncerProduct,
      ethLatAmTShirtProduct,

      ethLatAmAttendeeEmail,
      ethLatAmBouncerEmail,

      ethLatAmAttendeeName,
      ethLatAmBouncerName,

      ethBerlin,
      ethBerlinSettings,
      ethBerlinAttendeeProduct,
      ethBerlinBouncerProduct,
      ethBerlinTshirtProduct,

      // TODO:
      // ethBerlinAttendeeEmail,
      // ethBerlinBouncerEmail,

      orgUrl,
      token,

      ordersByEventID,
      eventsByEventID,
      productsByEventID,
      settingsByEventID,
      productCategoriesByEventID
    };
  }

  private newEvent(name: string, slug: string): GenericPretixEvent {
    return {
      name: { en: name },
      slug
    };
  }

  /**
   * E.g. GA, Bouncer, T-Shirt, Towel
   */
  private newProductType(
    productName: string,
    productCategoryId: number,
    { is_addon } = { is_addon: false }
  ): GenericPretixProduct {
    return {
      id: this.nextId(),
      name: { en: productName },
      category: productCategoryId,
      admission: !is_addon,
      personalized: !is_addon
    };
  }

  /**
   * @param orderEmail - array of (product id, attendee email) tuples,
   */
  private newOrder(
    orderEmail: string,
    orderName: string,
    positions: [
      number /* product id */,
      string | null /* email */,
      string | null /* name */,
      GenericPretixAnswer[] | null
    ][]
  ): GenericPretixOrder {
    const orderId = this.randomOrderCode();

    return {
      code: orderId,
      /**
       * name attached to order doesn't have to match names
       * on positions (individual purchased items)
       */
      name: orderName,
      status: "p", // p = paid
      testmode: false,
      secret: this.randomPositionSecret(),
      email: orderEmail,
      positions: positions.map(([product, email, name, answers]) =>
        // TODO @rob - is the sub event id meant to be using `this.nextId()`
        this.newPosition(
          orderId,
          email,
          name,
          product,
          this.nextId(),
          answers ?? []
        )
      )
    };
  }

  private newPosition(
    orderId: string,
    attendeeEmail: string | null,
    attendeeName: string | null,
    productId: number,
    subEventId: number,
    answers: GenericPretixAnswer[]
  ): GenericPretixPosition {
    return {
      id: this.nextId(),
      order: orderId,
      positionid: this.nextId(),
      /**
       * 'item' and 'product' and 'product type' are generally
       * used interchangably.
       */
      item: productId,
      price: "",
      attendee_name: attendeeName ?? "",
      attendee_email: attendeeEmail,
      subevent: subEventId,
      secret: this.randomPositionSecret(),
      checkins: [],
      answers
    };
  }

  private newEventSettings(): GenericPretixEventSettings {
    return {
      attendee_emails_asked: true,
      attendee_emails_required: true
    };
  }

  private newProductCategory(
    id: number,
    { is_addon }: { is_addon: boolean }
  ): GenericPretixProductCategory {
    return { id, is_addon };
  }

  private nextId(): number {
    return ++this.autoincrementingId;
  }

  private randomOrderCode(): string {
    return uuid().substring(0, 5).toUpperCase();
  }

  private randomPositionSecret(): string {
    return uuid().substring(0, 8);
  }
}
