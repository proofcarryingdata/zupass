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

/**
 * Sets up test data required to test {@link PretixPipeline}
 */
export function setupTestPretixPipeline(): PretixPipelineTestData {
  const adminGIUserId = randomUUID();
  const adminGIUserEmail = "admin@test.com";

  /**
   * Generic Issuance product user who has set up a {@link PretixPipeline}
   * via the Generic Issuance UI.
   */
  const ethLatAmGIUserID = randomUUID();
  const ethLatAmGIUserEmail = "eth-lat-am-gi-user@test.com";
  const EthLatAmBouncerIdentity = new Identity();
  const EthLatAmAttendeeIdentity = new Identity();

  const EthLatAmManualAttendeeIdentity = new Identity();
  const EthLatAmManualAttendeeEmail = "manual_attendee@example.com";

  const EthLatAmManualBouncerIdentity = new Identity();
  const EthLatAmManualBouncerEmail = "manual_bouncer@example.com";

  const EthLatAmImageUrl = "eth-latam-image-url";

  const pretixBackend = new GenericPretixDataMocker();
  const ethLatAmPretixOrganizer = pretixBackend.get().ethLatAmOrganizer;
  const ethLatAmEvent = ethLatAmPretixOrganizer.ethLatAm;
  const ethLatAmProducts = ethLatAmPretixOrganizer.productsByEventID.get(
    ethLatAmEvent.slug
  );
  expectToExist(ethLatAmProducts);
  /**
   * We expect an Attendee, a Bouncer, and a Tshirt product
   */
  expectLength(ethLatAmProducts, 3);
  const ethLatAmSuperuserProductIds: number[] = [
    pretixBackend.get().ethLatAmOrganizer.ethLatAmBouncerProduct.id
  ];
  expectLength(ethLatAmSuperuserProductIds, 1);

  const ethLatAmEventId = randomUUID();
  const ethLatAmConfiguredEvents: ConfiguredEvent[] = [
    {
      genericIssuanceId: ethLatAmEventId,
      externalId: ethLatAmEvent.slug,
      name: "Eth LatAm",
      imageOptions: {
        imageUrl: EthLatAmImageUrl,
        requireCheckedIn: true
      },
      products: ethLatAmProducts.map((product: GenericPretixProduct) => {
        return {
          externalId: product.id.toString(),
          genericIssuanceId: randomUUID(),
          name: getI18nString(product.name),
          isSuperUser: ethLatAmSuperuserProductIds.includes(product.id),
          nameQuestionPretixQuestionIdentitifier: NAME_QUESTION_IDENTIFIER
        };
      })
    }
  ];

  const ethLatAmAttendeeProduct = ethLatAmConfiguredEvents[0].products.find(
    (product) => product.name === "eth-latam-attendee-product"
  );
  expectToExist(ethLatAmAttendeeProduct);
  const ethLatAmBouncerProduct = ethLatAmConfiguredEvents[0].products.find(
    (product) => product.name === "eth-lat-am-bouncer-product"
  );
  expectToExist(ethLatAmBouncerProduct);

  const ethLatAmSemaphoreGroupIds = {
    all: randomUUID(),
    bouncers: randomUUID(),
    attendees: randomUUID(),
    attendeesAndBouncers: randomUUID()
  };

  const ethLatAmPipeline: PretixPipelineDefinition = {
    ownerUserId: ethLatAmGIUserID,
    timeCreated: new Date().toISOString(),
    timeUpdated: new Date().toISOString(),
    id: randomUUID(),
    editorUserIds: [],
    options: {
      // https://ethlatam.org/
      feedOptions: {
        feedDescription: "Eth Lat Am tickets! <copy>",
        feedDisplayName: "Eth LatAm",
        feedFolder: "Eth LatAm",
        feedId: "eth-latam"
      },
      events: ethLatAmConfiguredEvents,
      manualTickets: [
        {
          id: randomUUID(),
          eventId: ethLatAmEventId,
          productId: ethLatAmAttendeeProduct.genericIssuanceId,
          attendeeEmail: EthLatAmManualAttendeeEmail,
          attendeeName: "Manual Attendee"
        },
        {
          id: randomUUID(),
          eventId: ethLatAmEventId,
          productId: ethLatAmBouncerProduct.genericIssuanceId,
          attendeeEmail: EthLatAmManualBouncerEmail,
          attendeeName: "Manual Bouncer"
        }
      ],
      semaphoreGroups: [
        {
          // All attendees, irrespective of product type
          name: "All EthLatAm Attendees",
          groupId: ethLatAmSemaphoreGroupIds.all,
          memberCriteria: [{ eventId: ethLatAmEventId }]
        },
        {
          // Holders of bouncer-tier tickets
          name: "EthLatAm Bouncers",
          groupId: ethLatAmSemaphoreGroupIds.bouncers,
          memberCriteria: [
            {
              eventId: ethLatAmEventId,
              productId: ethLatAmBouncerProduct.genericIssuanceId
            }
          ]
        },
        {
          // Holders of attendee-tier tickets
          name: "EthLatAm Attendees",
          groupId: ethLatAmSemaphoreGroupIds.attendees,
          memberCriteria: [
            {
              eventId: ethLatAmEventId,
              productId: ethLatAmAttendeeProduct.genericIssuanceId
            }
          ]
        },
        {
          // Both holders of bouncer-tier tickets and attendee-tier tickets.
          // In this case, this group will have the same membership as the
          // "all" group, but if there were more tiers then this demonstrates
          // how it would be possible to create arbitrary groupings.
          name: "EthLatAm Bouncers and Attendees",
          groupId: ethLatAmSemaphoreGroupIds.attendeesAndBouncers,
          memberCriteria: [
            {
              eventId: ethLatAmEventId,
              productId: ethLatAmBouncerProduct.genericIssuanceId
            },
            {
              eventId: ethLatAmEventId,
              productId: ethLatAmAttendeeProduct.genericIssuanceId
            }
          ]
        }
      ],
      pretixAPIKey: ethLatAmPretixOrganizer.token,
      pretixOrgUrl: ethLatAmPretixOrganizer.orgUrl
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
    ethLatAmGIUserID,
    ethLatAmGIUserEmail,
    EthLatAmBouncerIdentity,
    EthLatAmAttendeeIdentity,
    EthLatAmManualAttendeeIdentity,
    EthLatAmManualAttendeeEmail,
    EthLatAmManualBouncerIdentity,
    EthLatAmManualBouncerEmail,
    EthLatAmImageUrl,
    pretixBackend,
    ethLatAmPretixOrganizer,
    ethLatAmEvent,
    ethLatAmProducts,
    ethLatAmSuperuserProductIds,
    ethLatAmEventId,
    ethLatAmConfiguredEvents,
    ethLatAmAttendeeProduct,
    ethLatAmBouncerProduct,
    ethLatAmPipeline,
    ethLatAmSemaphoreGroupIds,
    mockServer
  } satisfies PretixPipelineTestData;
}

export interface PretixPipelineTestData {
  adminGIUserId: string;
  adminGIUserEmail: string;
  ethLatAmGIUserID: string;
  ethLatAmGIUserEmail: string;
  EthLatAmBouncerIdentity: Identity;
  EthLatAmAttendeeIdentity: Identity;
  EthLatAmManualAttendeeIdentity: Identity;
  EthLatAmManualAttendeeEmail: string;
  EthLatAmManualBouncerIdentity: Identity;
  EthLatAmManualBouncerEmail: string;
  pretixBackend: GenericPretixDataMocker;
  ethLatAmPretixOrganizer: IOrganizer;
  ethLatAmEvent: GenericPretixEvent;
  ethLatAmProducts: GenericPretixProduct[];
  ethLatAmSuperuserProductIds: number[];
  ethLatAmEventId: string;
  ethLatAmConfiguredEvents: ConfiguredEvent[];
  ethLatAmAttendeeProduct: IConfiguredProduct;
  ethLatAmBouncerProduct: IConfiguredProduct;
  ethLatAmPipeline: PretixPipelineDefinition;
  EthLatAmImageUrl: string | undefined;
  ethLatAmSemaphoreGroupIds: {
    all: string;
    bouncers: string;
    attendees: string;
    attendeesAndBouncers: string;
  };
  mockServer: SetupServer;
}

export interface IConfiguredProduct {
  externalId: string;
  genericIssuanceId: string;
  name: string;
  isSuperUser: boolean;
  nameQuestionPretixQuestionIdentitifier: string;
}

export interface IConfiguredImageDetails {
  imageUrl: string;
  requireCheckedIn: boolean;
}

export interface ConfiguredEvent {
  genericIssuanceId: string;
  externalId: string;
  name: string;
  imageOptions: IConfiguredImageDetails | undefined;
  products: Array<IConfiguredProduct>;
}
