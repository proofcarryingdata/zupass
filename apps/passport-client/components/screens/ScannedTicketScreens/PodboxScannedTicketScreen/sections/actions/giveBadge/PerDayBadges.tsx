import {
  ActionConfigResponseValue,
  RateLimitedBadge
} from "@pcd/passport-interface";
import { Dispatch, ReactNode, SetStateAction, useCallback } from "react";
import styled from "styled-components";
import { Button } from "../../../../../../core";
import { useExecuteTicketAction } from "../useExecuteTicketAction";

export function PerDayBadges({
  precheck,
  eventId,
  ticketId,
  setInProgress,
  isLoading
}: {
  precheck: ActionConfigResponseValue;
  eventId: string;
  ticketId: string;
  setInProgress: Dispatch<SetStateAction<boolean>>;
  isLoading: boolean;
}): ReactNode {
  const options = precheck.giveBadgeActionInfo?.rateLimitedBadges ?? [];

  return (
    <Container>
      {options.map((o) => {
        return (
          <PerDayBadgeButton
            o={o}
            key={o.id}
            eventId={eventId}
            ticketId={ticketId}
            setInProgress={setInProgress}
            isLoading={isLoading}
          />
        );
      })}
    </Container>
  );
}

function PerDayBadgeButton({
  o,
  eventId,
  ticketId,
  setInProgress,
  isLoading
}: {
  o: RateLimitedBadge;
  eventId: string;
  ticketId: string;
  setInProgress: Dispatch<SetStateAction<boolean>>;
  isLoading: boolean;
}): ReactNode {
  const isDisabled = o.alreadyGivenInInterval >= o.maxInInterval;
  const leftToGive = o.maxInInterval - o.alreadyGivenInInterval;
  const giveBadge = useExecuteTicketAction({
    eventId,
    ticketId,
    action: {
      giftBadge: {
        badgeIds: [o.id]
      }
    }
  });
  const onClick = useCallback(async () => {
    setInProgress(true);
    giveBadge.execute().finally(() => {
      setInProgress(false);
    });
  }, [giveBadge, setInProgress]);

  return (
    <>
      <pre>{JSON.stringify(o, null, 2)}</pre>
      <Row>
        <Button disabled={isDisabled} onClick={onClick}>
          Give {o.id} ({leftToGive} left today)
        </Button>
      </Row>
    </>
  );
}

export const Container = styled.div``;

export const Row = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-direction: row;
  gap: 8px;
  margin-bottom: 8px;

  button {
    flex-grow: 1;
  }
`;
