import { v4 as uuid } from "uuid";
import {
  GenericPretixEvent,
  GenericPretixEventSettings,
  GenericPretixOrder,
  GenericPretixPosition,
  GenericPretixProduct,
  GenericPretixProductCategory
} from "../../src/apis/pretix/genericPretixAPI";
import { randomName } from "../util/util";

/**
 *
 */
export interface IMockGenericIssuancePretixBackendData {
  // aggregate data for simpler querying
  organizers: IOrganizer[];
  organizersByOrgUrl: Map<string, IOrganizer>;

  // specific data for easier testing
  ethLatAmOrganizer: IOrganizer;
  // TODO: test multi-organizer scenarios better
  ethBerlinOrganizer: IOrganizer;
}

export interface IOrganizer {
  orgUrl: string;
  token: string;

  // eth latam setup type

  ethLatAm: GenericPretixEvent;
  ethLatAmSettings: GenericPretixEventSettings;

  ethLatAmAttendeeProduct: GenericPretixProduct;
  ethLatAmBouncerProduct: GenericPretixProduct;
  ethLatAmTshirtProduct: GenericPretixProduct;

  ethLatAmAttendeeEmail: string;
  ethLatAmBouncerEmail: string;

  // eth berlin setup type

  ethBerlin: GenericPretixEvent;
  ethBerlinSettings: GenericPretixEventSettings;
  ethBerlinAttendeeProduct: GenericPretixProduct;
  ethBerlinBouncerProduct: GenericPretixProduct;
  ethBerlinTshirtProduct: GenericPretixProduct;
  ethBerlinAttendeeEmail: string;
  ethBerlinBouncerEmail: string;

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
  private data: IMockGenericIssuancePretixBackendData;

  public constructor() {
    this.data = this.newMockData();
  }

  public backup(): IMockGenericIssuancePretixBackendData {
    return structuredClone(this.data);
  }

  public restore(data: IMockGenericIssuancePretixBackendData): void {
    this.data = data;
  }

  public get(): IMockGenericIssuancePretixBackendData {
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

  private newMockData(): IMockGenericIssuancePretixBackendData {
    const organizer1 = this.newOrganizer("organizer-1");
    const organizer2 = this.newOrganizer("organizer-2");

    const organizersByOrgUrl = new Map<string, IOrganizer>();
    organizersByOrgUrl.set(organizer1.orgUrl, organizer1);
    organizersByOrgUrl.set(organizer2.orgUrl, organizer2);

    return {
      organizers: [organizer1, organizer2],
      organizersByOrgUrl: organizersByOrgUrl,
      ethBerlinOrganizer: organizer2,
      ethLatAmOrganizer: organizer1
    };
  }

  /**
   * Note to self: we don't test multi-organizer scenarios very thoroughly.
   */
  private newOrganizer(name: string): IOrganizer {
    const orgUrl = `https://www.${name}.com`;
    const token = uuid();

    const EthLatAmAttendee1Email = `attendee-1-${name}@test.com`;
    const EthLatAmAttendee2Email = `attendee-2-${name}@test.com`;
    const EthLatAmBouncer1Email = `bouncer-1${name}@test.com`;
    const EthLatAmBouncer2Email = `bouncer-2${name}@test.com`;

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
      this.newProductCategory(addonCategory, { is_addon: false })
    ];

    const ethLatAmAttendeeProduct = this.newProductType(
      "eth-latam-attende",
      this.nextId()
    );
    const ethLatAmBouncerProduct = this.newProductType(
      "eth-lat-am-attendee-bouncer",
      this.nextId()
    );
    // Add-on Product - e.g. t-shirt or towel
    const ethLatAmTshirtProduct = this.newProductType(
      "eth-latam-t-shirt",
      this.nextId(),
      {
        is_addon: true
      }
    );
    const ethBerlinAttendeeProduct = this.newProductType(
      "eth-berlin-attendee",
      this.nextId()
    );
    const ethBerlinBouncerProduct = this.newProductType(
      "eth-berlin-bouncer",
      this.nextId()
    );
    // Add-on Product - e.g. t-shirt or towel
    const ethBerlinAddonProduct = this.newProductType(
      "eth-berlin-addon",
      this.nextId(),
      {
        is_addon: true
      }
    );

    const ethLatAmOrders: GenericPretixOrder[] = [
      this.newOrder(EthLatAmBouncer2Email, [
        [ethLatAmAttendeeProduct.id, EthLatAmBouncer2Email]
      ]),
      this.newOrder(EthLatAmAttendee1Email, [
        [ethLatAmAttendeeProduct.id, EthLatAmAttendee1Email],
        [ethLatAmAttendeeProduct.id, EthLatAmAttendee2Email],
        [ethLatAmAttendeeProduct.id, EthLatAmAttendee2Email],
        [ethLatAmAttendeeProduct.id, EthLatAmBouncer1Email],
        [ethLatAmAttendeeProduct.id, null],
        [ethLatAmBouncerProduct.id, EthLatAmAttendee1Email],
        [ethLatAmBouncerProduct.id, EthLatAmAttendee1Email],
        [ethLatAmBouncerProduct.id, EthLatAmAttendee2Email],
        [ethLatAmBouncerProduct.id, null],
        [ethBerlinAttendeeProduct.id, EthLatAmAttendee2Email],
        [ethLatAmBouncerProduct.id, EthLatAmBouncer2Email]
      ]),
      this.newOrder(EthLatAmAttendee2Email, [
        [ethLatAmBouncerProduct.id, EthLatAmBouncer2Email],
        [ethLatAmBouncerProduct.id, null],
        [ethLatAmAttendeeProduct.id, EthLatAmAttendee1Email]
      ])
    ];

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
      ethLatAmTshirtProduct
    ]);
    productsByEventID.set(ethBerlin.slug, [
      ethBerlinAttendeeProduct,
      ethBerlinAddonProduct,
      ethLatAmTshirtProduct
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
      ethLatAmAttendeeProduct: ethLatAmAttendeeProduct,
      ethLatAmBouncerProduct: ethLatAmBouncerProduct,
      ethLatAmTshirtProduct: ethLatAmTshirtProduct,
      ethLatAmAttendeeEmail: EthLatAmAttendee1Email,
      ethLatAmBouncerEmail: EthLatAmAttendee2Email,

      ethBerlin,
      ethBerlinSettings,
      ethBerlinAttendeeProduct: ethBerlinAttendeeProduct,
      ethBerlinBouncerProduct: ethBerlinBouncerProduct,
      ethBerlinTshirtProduct: ethBerlinAddonProduct,
      ethBerlinAttendeeEmail: EthLatAmBouncer1Email,
      ethBerlinBouncerEmail: EthLatAmBouncer2Email,

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
    productEmailPairs: [number, string | null][]
  ): GenericPretixOrder {
    const orderId = this.randomOrderCode();

    return {
      code: orderId,
      /**
       * name attached to order doesn't have to match names
       * on positions (individual purchased items)
       */
      name: randomName(),
      status: "p", // p = paid
      testmode: false,
      secret: this.randomPositionSecret(),
      email: orderEmail,
      positions: productEmailPairs.map(([product, email]) =>
        // TODO @rob - is the sub event id meant to be using `this.nextId()`
        this.newPosition(orderId, email, product, this.nextId())
      )
    };
  }

  private newPosition(
    orderId: string,
    attendeeEmail: string | null,
    productId: number,
    subEventId: number
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
      attendee_name: randomName(),
      attendee_email: attendeeEmail,
      subevent: subEventId,
      secret: this.randomPositionSecret(),
      checkins: []
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
