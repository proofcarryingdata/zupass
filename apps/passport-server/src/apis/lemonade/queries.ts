import { gql } from "@apollo/client";

export const getHostingEventsQuery = gql(`
  query GetHostingEvents($skip: Int!, $limit: Int!) {
    getHostingEvents(skip: $skip, limit: $limit) {
      _id,
      title
    }
  }
`);

export const getEventTicketTypesQuery = gql(`
  query GetEventTicketTypes($input: GetEventTicketTypesInput!) {
    getEventTicketTypes(input: $input) {
      ticket_types {
        _id
        title
      }
    }
  }
`);

export const updateEventCheckinMutation = gql(`
mutation UpdateEventCheckin($event: MongoID!, $user: MongoID!, $active: Boolean!) {
  updateEventCheckin(input: { event: $event, user: $user, active: $active })
}
`);
