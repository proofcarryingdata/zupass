import {
  LemonadePipelineDefinition,
  PipelineType
} from "@pcd/passport-interface";
import { randomUUID } from "@pcd/util";
import { Identity } from "@semaphore-protocol/identity";
import {
  ILemonadeAPI,
  getLemonadeAPI
} from "../../../../src/apis/lemonade/lemonadeAPI";
import {
  LemonadeEvent,
  LemonadeTicket,
  LemonadeTicketType
} from "../../../../src/apis/lemonade/types";
import {
  LemonadeAccount,
  LemonadeDataMocker,
  LemonadeUser
} from "../../../lemonade/LemonadeDataMocker";
import { TestTokenSource } from "../../../lemonade/TestTokenSource";

export interface LemonadePipelineTestData {
  edgeCityPipeline: LemonadePipelineDefinition;

  edgeCityGIUserID: string;
  edgeCityGIUserEmail: string;
  EdgeCityLemonadeAccount: LemonadeAccount;
  EdgeCityDenver: LemonadeEvent;
  EdgeCityAttendeeTicketType: LemonadeTicketType;
  EdgeCityBouncerTicketType: LemonadeTicketType;

  EdgeCityDenverAttendee: LemonadeUser;
  EdgeCityDenverAttendeeIdentity: Identity;
  EdgeCityAttendeeTicket: LemonadeTicket;

  EdgeCityDenverBouncer: LemonadeUser;
  EdgeCityBouncerIdentity: Identity;
  EdgeCityDenverBouncerTicket: LemonadeTicket;

  EdgeCityDenverBouncer2: LemonadeUser;
  EdgeCityBouncer2Identity: Identity;
  EdgeCityDenverBouncer2Ticket: LemonadeTicket;

  EdgeCityManualAttendeeIdentity: Identity;
  EdgeCityManualAttendeeEmail: string;

  EdgeCityManualBouncerIdentity: Identity;
  EdgeCityManualBouncerEmail: string;

  lemonadeTokenSource: TestTokenSource;

  lemonadeAPI: ILemonadeAPI;
  edgeCitySemaphoreGroupIds: {
    all: string;
    bouncers: string;
    attendees: string;
    attendeesAndBouncers: string;
  };

  lemonadeBackendUrl: string;
  edgeCityDenverEventId: string;
  edgeCityDenverAttendeeProductId: string;
  edgeCityDenverBouncerProductId: string;

  lemonadeBackend: LemonadeDataMocker;
  lemonadeOAuthClientId: string;
}

export function setupLemonadePipeline(): LemonadePipelineTestData {
  const lemonadeOAuthClientId = "edge-city-client-id";
  const lemonadeBackend = new LemonadeDataMocker();

  /**
   * Generic Issuance product user who has set up a {@link LemonadePipeline}
   * via the Generic Issuance UI.
   */
  const edgeCityGIUserID = randomUUID();
  const edgeCityGIUserEmail = "edge-city-gi-user@test.com";

  const EdgeCityLemonadeAccount = lemonadeBackend.addAccount(
    lemonadeOAuthClientId
  );

  const EdgeCityDenver = EdgeCityLemonadeAccount.addEvent("Edge City Denver");

  /**
   * Attendee ticket type. In reality there will be several.
   */
  const EdgeCityAttendeeTicketType: LemonadeTicketType =
    EdgeCityLemonadeAccount.addTicketType(EdgeCityDenver._id, "ga");
  const EdgeCityBouncerTicketType: LemonadeTicketType =
    EdgeCityLemonadeAccount.addTicketType(EdgeCityDenver._id, "bouncer");

  /**
   * Most tests below need a person who is checking tickets {@link EdgeCityDenverBouncer}
   * and a person whose ticket needs to be checked in (@link Attendee)
   */
  const EdgeCityDenverAttendee: LemonadeUser = lemonadeBackend.addUser(
    "attendee@example.com",
    "attendee",
    "smith"
  );
  const EdgeCityDenverAttendeeIdentity = new Identity();
  const EdgeCityAttendeeTicket: LemonadeTicket =
    EdgeCityLemonadeAccount.addUserTicket(
      EdgeCityDenver._id,
      EdgeCityAttendeeTicketType._id,
      EdgeCityDenverAttendee._id,
      `${EdgeCityDenverAttendee.first_name} ${EdgeCityDenverAttendee.last_name}`
    );

  /**
   * Similar to {@link EdgeCityDenverAttendee}
   * Person who has a {@link LemonadeTicket} that does not have a bouncer ticket,
   * i.e. a ticket whose 'product id' or 'tier' is set up to be a 'superuser' ticket
   * by the Generic Issuance User with id {@link edgeCityGIUserID}.
   */
  const EdgeCityDenverBouncer: LemonadeUser = lemonadeBackend.addUser(
    "bouncer@example.com",
    "bouncer",
    "bob"
  );
  const EdgeCityBouncerIdentity = new Identity();
  const EdgeCityDenverBouncerTicket = EdgeCityLemonadeAccount.addUserTicket(
    EdgeCityDenver._id,
    EdgeCityBouncerTicketType._id,
    EdgeCityDenverBouncer._id,
    `${EdgeCityDenverBouncer.first_name} ${EdgeCityDenverBouncer.last_name}`
  );

  /**
   * Similar to {@link EdgeCityBouncerIdentity}, except configured to be
   * a bouncer via the {@link LemonadePipelineOptions#superuserEmails}
   */
  const EdgeCityDenverBouncer2: LemonadeUser = lemonadeBackend.addUser(
    "bouncer2@example.com",
    "bouncer2",
    "joe"
  );
  const EdgeCityBouncer2Identity = new Identity();
  const EdgeCityDenverBouncer2Ticket = EdgeCityLemonadeAccount.addUserTicket(
    EdgeCityDenver._id,
    EdgeCityAttendeeTicketType._id,
    EdgeCityDenverBouncer2._id,
    `${EdgeCityDenverBouncer2.first_name} ${EdgeCityDenverBouncer2.last_name}`
  );

  const EdgeCityManualAttendeeIdentity = new Identity();
  const EdgeCityManualAttendeeEmail = "manual_attendee@example.com";

  const EdgeCityManualBouncerIdentity = new Identity();
  const EdgeCityManualBouncerEmail = "manual_bouncer@example.com";

  const lemonadeTokenSource = new TestTokenSource();
  const lemonadeAPI: ILemonadeAPI = getLemonadeAPI(
    // LemonadeAPI takes an optional `AuthTokenSource` as a parameter. This
    // allows us to mock out the generation of tokens that would otherwise be
    // done by making OAuth requests.
    // TestTokenSource simply returns the `oauthClientId` as the token.
    lemonadeTokenSource
  );
  const edgeCitySemaphoreGroupIds = {
    all: randomUUID(),
    bouncers: randomUUID(),
    attendees: randomUUID(),
    attendeesAndBouncers: randomUUID()
  };
  const lemonadeBackendUrl = "http://localhost";
  const edgeCityDenverEventId = randomUUID();
  const edgeCityDenverAttendeeProductId = randomUUID();
  const edgeCityDenverBouncerProductId = randomUUID();

  const edgeCityPipeline: LemonadePipelineDefinition = {
    ownerUserId: edgeCityGIUserID,
    timeCreated: new Date().toISOString(),
    timeUpdated: new Date().toISOString(),
    id: randomUUID(),
    /**
     * TODO: test that the API that lets the frontend make changes to {@link Pipeline}s
     * on the backend respects generic issuance user permissions. @richard
     */
    editorUserIds: [],
    options: {
      feedOptions: {
        // TODO: @richard what do the organizers want these tickets to be called?
        feedDescription: "Edge City Denver tickets!",
        feedDisplayName: "Edge City Denver",
        feedFolder: "Edge City",
        feedId: "edge-city"
      },
      // Authentication values are not relevant for testing, except for `oauthClientId`
      oauthAudience: "test",
      oauthClientId: lemonadeOAuthClientId,
      oauthClientSecret: "test",
      oauthServerUrl: "test",
      backendUrl: lemonadeBackendUrl,
      superuserEmails: [EdgeCityDenverBouncer2.email],
      events: [
        {
          externalId: EdgeCityDenver._id,
          name: EdgeCityDenver.title,
          genericIssuanceEventId: edgeCityDenverEventId,
          ticketTypes: [
            {
              externalId: EdgeCityBouncerTicketType._id,
              genericIssuanceProductId: edgeCityDenverBouncerProductId,
              isSuperUser: true,
              name: "Bouncer"
            },
            {
              externalId: EdgeCityAttendeeTicketType._id,
              genericIssuanceProductId: edgeCityDenverAttendeeProductId,
              isSuperUser: false,
              name: "Attendee"
            }
          ]
        }
      ],
      manualTickets: [
        {
          id: randomUUID(),
          eventId: edgeCityDenverEventId,
          productId: edgeCityDenverAttendeeProductId,
          attendeeName: "Manual Attendee",
          attendeeEmail: EdgeCityManualAttendeeEmail
        },
        {
          id: randomUUID(),
          eventId: edgeCityDenverEventId,
          productId: edgeCityDenverBouncerProductId,
          attendeeName: "Manual Bouncer",
          attendeeEmail: EdgeCityManualBouncerEmail
        }
      ],
      semaphoreGroups: [
        {
          // All attendees, irrespective of product type
          name: "All",
          groupId: edgeCitySemaphoreGroupIds.all,
          memberCriteria: [{ eventId: edgeCityDenverEventId }]
        },
        {
          // Holders of bouncer-tier tickets
          name: "Bouncers",
          groupId: edgeCitySemaphoreGroupIds.bouncers,
          memberCriteria: [
            {
              eventId: edgeCityDenverEventId,
              productId: edgeCityDenverBouncerProductId
            }
          ]
        },
        {
          // Holders of attendee-tier tickets
          name: "Attendees",
          groupId: edgeCitySemaphoreGroupIds.attendees,
          memberCriteria: [
            {
              eventId: edgeCityDenverEventId,
              productId: edgeCityDenverAttendeeProductId
            }
          ]
        },
        {
          // Both holders of bouncer-tier tickets and attendee-tier tickets.
          // In this case, this group will have the same membership as the
          // "all" group, but if there were more tiers then this demonstrates
          // how it would be possible to create arbitrary groupings.
          name: "Attendees and Bouncers",
          groupId: edgeCitySemaphoreGroupIds.attendeesAndBouncers,
          memberCriteria: [
            {
              eventId: edgeCityDenverEventId,
              productId: edgeCityDenverBouncerProductId
            },
            {
              eventId: edgeCityDenverEventId,
              productId: edgeCityDenverAttendeeProductId
            }
          ]
        }
      ]
    },
    type: PipelineType.Lemonade
  };

  return {
    edgeCityPipeline,
    edgeCityGIUserID,
    edgeCityGIUserEmail,
    EdgeCityLemonadeAccount,
    EdgeCityDenver,
    EdgeCityAttendeeTicketType,
    EdgeCityBouncerTicketType,

    EdgeCityDenverAttendee,
    EdgeCityDenverAttendeeIdentity,
    EdgeCityAttendeeTicket,

    EdgeCityDenverBouncer,
    EdgeCityBouncerIdentity,
    EdgeCityDenverBouncerTicket,

    EdgeCityDenverBouncer2,
    EdgeCityBouncer2Identity,
    EdgeCityDenverBouncer2Ticket,

    EdgeCityManualAttendeeIdentity,
    EdgeCityManualAttendeeEmail,

    EdgeCityManualBouncerIdentity,
    EdgeCityManualBouncerEmail,

    lemonadeTokenSource,

    lemonadeAPI,
    edgeCitySemaphoreGroupIds,

    lemonadeBackendUrl,
    edgeCityDenverEventId,
    edgeCityDenverAttendeeProductId,
    edgeCityDenverBouncerProductId,
    lemonadeBackend,
    lemonadeOAuthClientId
  } satisfies LemonadePipelineTestData;
}
