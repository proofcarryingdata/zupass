import {
  GenericPretixEvent,
  GenericPretixProduct,
  PipelineType,
  PretixPipelineDefinition,
  getI18nString
} from "@pcd/passport-interface";
import { randomUUID } from "@pcd/util";
import { Identity } from "@semaphore-protocol/identity";
import { SetupServer, setupServer } from "msw/node";
import {
  GenericPretixDataMocker,
  IOrganizer,
  NAME_QUESTION_IDENTIFIER
} from "../../../pretix/GenericPretixDataMocker";
import { getMockGenericPretixHandlers } from "../../../pretix/MockGenericPretixServer";
import { expectLength, expectToExist } from "../../../util/util";
import {
  ConfiguredEvent,
  IConfiguredProduct
} from "../pretix/setupTestPretixPipeline";

/**
 * Sets up test data required to test {@link PretixPipeline}'s auto-issuance features
 */
export function setupAutoIssuancePipeline(): AutoIssuancePipelineTestData {
  const adminGIUserId = randomUUID();
  const adminGIUserEmail = "admin@test.com";
  const autoIssuanceGIUserID = randomUUID();
  const autoIssuanceGIUserEmail = "auto-issuance-user@test.com";
  const AutoIssuanceBouncerIdentity = new Identity();
  const AutoIssuanceAttendeeIdentity = new Identity();

  const AutoIssuanceManualAttendeeIdentity = new Identity();
  const AutoIssuanceManualAttendeeEmail = "manual_attendee@example.com";

  const AutoIssuanceManualBouncerIdentity = new Identity();
  const AutoIssuanceManualBouncerEmail = "manual_bouncer@example.com";

  const AutoIssuanceImageUrl = "auto-issuance-image-url";

  const pretixBackend = new GenericPretixDataMocker();
  const autoIssuancePretixOrganizer = pretixBackend.get().autoIssuanceOrganizer;
  const autoIssuanceEvent = autoIssuancePretixOrganizer.autoIssuance;
  const autoIssuanceProducts =
    autoIssuancePretixOrganizer.productsByEventID.get(autoIssuanceEvent.slug);
  expectToExist(autoIssuanceProducts);
  /**
   * We expect an Attendee, a Bouncer, Food Voucher, and Food Vendor product
   */
  expectLength(autoIssuanceProducts, 4);
  const autoIssuanceSuperuserProductIds: number[] = [
    pretixBackend.get().autoIssuanceOrganizer.autoIssuanceBouncerProduct.id
  ];
  expectLength(autoIssuanceSuperuserProductIds, 1);

  const autoIssuanceEventId = randomUUID();
  const autoIssuanceConfiguredEvents: ConfiguredEvent[] = [
    {
      genericIssuanceId: autoIssuanceEventId,
      externalId: autoIssuanceEvent.slug,
      name: "Auto Issuance",
      imageOptions: {
        imageUrl: AutoIssuanceImageUrl,
        requireCheckedIn: true
      },
      products: autoIssuanceProducts.map((product: GenericPretixProduct) => {
        return {
          externalId: product.id.toString(),
          genericIssuanceId: randomUUID(),
          name: getI18nString(product.name),
          isSuperUser: autoIssuanceSuperuserProductIds.includes(product.id),
          nameQuestionPretixQuestionIdentitifier: NAME_QUESTION_IDENTIFIER
        };
      })
    }
  ];

  const autoIssuanceAttendeeProduct =
    autoIssuanceConfiguredEvents[0].products.find(
      (product) => product.name === "auto-issuance-attendee-product"
    );
  expectToExist(autoIssuanceAttendeeProduct);
  const autoIssuanceBouncerProduct =
    autoIssuanceConfiguredEvents[0].products.find(
      (product) => product.name === "auto-issuance-bouncer-product"
    );
  expectToExist(autoIssuanceBouncerProduct);
  const autoIssuanceFoodVoucherProduct =
    autoIssuanceConfiguredEvents[0].products.find(
      (product) => product.name === "auto-issuance-food-voucher-product"
    );
  expectToExist(autoIssuanceFoodVoucherProduct);
  const autoIssuanceFoodVendorProduct =
    autoIssuanceConfiguredEvents[0].products.find(
      (product) => product.name === "auto-issuance-food-vendor-product"
    );
  expectToExist(autoIssuanceFoodVendorProduct);

  const autoIssuanceSemaphoreGroupIds = {
    all: randomUUID(),
    bouncers: randomUUID(),
    attendees: randomUUID(),
    attendeesAndBouncers: randomUUID()
  };

  const autoIssuancePipeline: PretixPipelineDefinition = {
    ownerUserId: autoIssuanceGIUserID,
    timeCreated: new Date().toISOString(),
    timeUpdated: new Date().toISOString(),
    id: randomUUID(),
    editorUserIds: [],
    options: {
      feedOptions: {
        feedDescription: "Auto Issuance Feed",
        feedDisplayName: "Auto Issuance",
        feedFolder: "Auto Issuance",
        feedId: "auto-issuance"
      },
      events: autoIssuanceConfiguredEvents,
      manualTickets: [
        {
          id: randomUUID(),
          eventId: autoIssuanceEventId,
          productId: autoIssuanceAttendeeProduct.genericIssuanceId,
          attendeeEmail: AutoIssuanceManualAttendeeEmail,
          attendeeName: "Manual Attendee"
        },
        {
          id: randomUUID(),
          eventId: autoIssuanceEventId,
          productId: autoIssuanceBouncerProduct.genericIssuanceId,
          attendeeEmail: AutoIssuanceManualBouncerEmail,
          attendeeName: "Manual Bouncer"
        }
      ],
      semaphoreGroups: [
        {
          // All attendees, irrespective of product type
          name: "All Auto Issuance Attendees",
          groupId: autoIssuanceSemaphoreGroupIds.all,
          memberCriteria: [{ eventId: autoIssuanceEventId }]
        },
        {
          // Holders of bouncer-tier tickets
          name: "Auto Issuance Bouncers",
          groupId: autoIssuanceSemaphoreGroupIds.bouncers,
          memberCriteria: [
            {
              eventId: autoIssuanceEventId,
              productId: autoIssuanceBouncerProduct.genericIssuanceId
            }
          ]
        },
        {
          // Holders of attendee-tier tickets
          name: "Auto Issuance Attendees",
          groupId: autoIssuanceSemaphoreGroupIds.attendees,
          memberCriteria: [
            {
              eventId: autoIssuanceEventId,
              productId: autoIssuanceAttendeeProduct.genericIssuanceId
            }
          ]
        },
        {
          // Both holders of bouncer-tier tickets and attendee-tier tickets.
          // In this case, this group will have the same membership as the
          // "all" group, but if there were more tiers then this demonstrates
          // how it would be possible to create arbitrary groupings.
          name: "Auto Issuance Bouncers and Attendees",
          groupId: autoIssuanceSemaphoreGroupIds.attendeesAndBouncers,
          memberCriteria: [
            {
              eventId: autoIssuanceEventId,
              productId: autoIssuanceBouncerProduct.genericIssuanceId
            },
            {
              eventId: autoIssuanceEventId,
              productId: autoIssuanceAttendeeProduct.genericIssuanceId
            }
          ]
        }
      ],
      pretixAPIKey: autoIssuancePretixOrganizer.token,
      pretixOrgUrl: autoIssuancePretixOrganizer.orgUrl,
      enablePODTickets: true
    },
    type: PipelineType.Pretix
  };

  const pretixOrgUrls = pretixBackend.get().organizersByOrgUrl.keys();

  const mockServer = setupServer(
    ...getMockGenericPretixHandlers(pretixOrgUrls, pretixBackend)
  );

  return {
    adminGIUserId,
    adminGIUserEmail,
    autoIssuanceGIUserID,
    autoIssuanceGIUserEmail,
    AutoIssuanceBouncerIdentity,
    AutoIssuanceAttendeeIdentity,
    AutoIssuanceManualAttendeeIdentity,
    AutoIssuanceManualAttendeeEmail,
    AutoIssuanceManualBouncerIdentity,
    AutoIssuanceManualBouncerEmail,
    AutoIssuanceImageUrl,
    autoIssuancePretixOrganizer,
    autoIssuanceEvent,
    autoIssuanceProducts,
    autoIssuanceSuperuserProductIds,
    autoIssuanceEventId,
    autoIssuanceConfiguredEvents,
    autoIssuanceAttendeeProduct,
    autoIssuanceBouncerProduct,
    autoIssuancePipeline,
    autoIssuanceSemaphoreGroupIds,
    pretixBackend,
    mockServer
  } satisfies AutoIssuancePipelineTestData;
}

export interface AutoIssuancePipelineTestData {
  adminGIUserId: string;
  adminGIUserEmail: string;
  autoIssuanceGIUserID: string;
  autoIssuanceGIUserEmail: string;
  AutoIssuanceBouncerIdentity: Identity;
  AutoIssuanceAttendeeIdentity: Identity;
  AutoIssuanceManualAttendeeIdentity: Identity;
  AutoIssuanceManualAttendeeEmail: string;
  AutoIssuanceManualBouncerIdentity: Identity;
  AutoIssuanceManualBouncerEmail: string;
  pretixBackend: GenericPretixDataMocker;
  autoIssuancePretixOrganizer: IOrganizer;
  autoIssuanceEvent: GenericPretixEvent;
  autoIssuanceProducts: GenericPretixProduct[];
  autoIssuanceSuperuserProductIds: number[];
  autoIssuanceEventId: string;
  autoIssuanceConfiguredEvents: ConfiguredEvent[];
  autoIssuanceAttendeeProduct: IConfiguredProduct;
  autoIssuanceBouncerProduct: IConfiguredProduct;
  autoIssuancePipeline: PretixPipelineDefinition;
  AutoIssuanceImageUrl: string | undefined;
  autoIssuanceSemaphoreGroupIds: {
    all: string;
    bouncers: string;
    attendees: string;
    attendeesAndBouncers: string;
  };
  mockServer: SetupServer;
}
