import { PipelineOfflineCheckin } from "@pcd/passport-interface";
import { ReactNode } from "react";
import styled from "styled-components";
import { timeAgo } from "../../../helpers/util";

/**
 * Displays the queued offline check-ins for this pipeline.
 * Most of the time this will be empty, but if an offline check-in has been
 * added since the last pipeline load then it will be visible here.
 * It may also be possible for a check-in to become "stuck" if the ticket that
 * it refers to is deleted in the back-end system.
 */
export function PipelineQueuedOfflineCheckinsSection({
  queuedOfflineCheckins
}: {
  queuedOfflineCheckins?: PipelineOfflineCheckin[];
}): ReactNode {
  if (!queuedOfflineCheckins || queuedOfflineCheckins.length === 0) {
    return (
      <div>
        There are no offline check-ins queued for synchronization with the
        back-end.
      </div>
    );
  }

  return (
    <OfflineCheckinTable>
      <thead>
        <tr>
          <th>Ticket ID</th>
          <th>Checker</th>
          <th>Time</th>
          <th>Attempts</th>
        </tr>
      </thead>
      <tbody>
        {queuedOfflineCheckins
          .sort(
            (a, b) =>
              a.checkinTimestamp.getTime() - b.checkinTimestamp.getTime()
          )
          .map((offlineCheckin) => {
            const checkinDate = new Date(
              offlineCheckin.checkinTimestamp
            ).toLocaleDateString();
            const checkinAgo = timeAgo.format(
              new Date(offlineCheckin.checkinTimestamp),
              "mini"
            );
            return (
              <tr key={offlineCheckin.ticketId}>
                <TicketID title={offlineCheckin.ticketId}>
                  {offlineCheckin.ticketId}
                </TicketID>
                <CheckerEmail title={offlineCheckin.checkerEmail}>
                  {offlineCheckin.checkerEmail}
                </CheckerEmail>
                <td title={checkinDate}>{checkinAgo} ago</td>
                <td>{offlineCheckin.attempts}</td>
              </tr>
            );
          })}
      </tbody>
    </OfflineCheckinTable>
  );
}

const OfflineCheckinTable = styled.table`
  border-spacing: 5px 2px;
  border-collapse: separate;

  th {
    font-family: var(--chakra-fonts-body) !important;
    font-weight: bold !important;
    text-align: left;
    padding-right: 32px;
  }

  td {
    margin-right: 32px;
    font-size: 0.8rem;
  }
`;

const CheckerEmail = styled.td`
  max-width: 20ch;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  height: 100%;
`;

const TicketID = styled.td`
  max-width: 8ch;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  height: 100%;
`;
