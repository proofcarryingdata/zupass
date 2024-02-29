import { ticketDisplayName } from "@pcd/eddsa-ticket-pcd";
import {
  BadgeConfig,
  PodboxActionPreCheckResult
} from "@pcd/passport-interface";
import {
  Dispatch,
  ReactNode,
  SetStateAction,
  useEffect,
  useMemo,
  useState
} from "react";
import styled from "styled-components";
import { Button, Spacer } from "../../../../../../core";
import { RippleLoader } from "../../../../../../core/RippleLoader";
import {
  ErrorContainer,
  StatusContainer
} from "../../../PodboxScannedTicketScreen";
import { useExecuteTicketAction } from "../useExecuteTicketAction";
import { PerDayBadges } from "./PerDayBadges";

function badgeDisplayName(c: BadgeConfig): string {
  return ticketDisplayName(c.eventName, c.productName);
}

export function GiveBadgeActionSection({
  ticketId,
  eventId,
  setIsLoading: setInProgress,
  precheck,
  isLoading
}: {
  ticketId: string;
  eventId: string;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  precheck: PodboxActionPreCheckResult;
  isLoading: boolean;
}): ReactNode {
  const [selectedBadge, setSelectedBadge] = useState<BadgeConfig | undefined>();
  const [givenBadgesThisSession, setGivenBadgesThisSession] = useState<
    Set<string>
  >(new Set());

  const executor = useExecuteTicketAction({
    eventId,
    ticketId,
    action: {
      giftBadge: {
        badgeIds: selectedBadge ? [selectedBadge.id] : []
      }
    }
  });

  useEffect(() => {
    setInProgress(executor.loading);
  }, [executor.loading, setInProgress]);

  useEffect(() => {
    if (executor?.result?.success) {
      setGivenBadgesThisSession((set) => {
        set.add(selectedBadge.id ?? "");
        return new Set(Array.from(set));
        return set;
      });
    }
  }, [executor.result?.success, selectedBadge?.id]);

  const badgeOptions = useMemo(() => {
    return (
      precheck?.value?.giveBadgeActionInfo?.giveableBadges
        ?.filter((o) => !givenBadgesThisSession.has(o.id ?? ""))
        ?.map((c) => ({
          ...c,
          label: badgeDisplayName(c)
        })) ?? []
    );
  }, [
    givenBadgesThisSession,
    precheck.value?.giveBadgeActionInfo?.giveableBadges
  ]);

  if (
    !precheck.value?.success ||
    !precheck.value?.giveBadgeActionInfo?.permissioned
  ) {
    // scanner can't issue badge to the scanee
    return null;
  }

  if (executor.loading) {
    return (
      <>
        <RippleLoader />
        <Spacer h={8} />
      </>
    );
  }

  if (isLoading) {
    return null;
  }

  if (executor.result?.success) {
    return (
      <>
        <StatusContainer size="small" disabled={isLoading}>
          Gave {badgeDisplayName(selectedBadge)}
        </StatusContainer>
        <Spacer h={8} />
        <Button
          onClick={(): void => {
            executor.reset();
            setSelectedBadge(undefined);
          }}
        >
          Give Another Badge
        </Button>
        <Spacer h={8} />
      </>
    );
  } else if (executor.result?.error) {
    return (
      <>
        <ErrorContainer>
          😵 Couldn't Grant Badge <br />
          {executor.result.error}
        </ErrorContainer>
        <Spacer h={8} />
      </>
    );
  }

  const disabled = badgeOptions.length === 0;

  if (!precheck.value?.giveBadgeActionInfo?.permissioned) {
    return null;
  }

  return (
    <div style={{ userSelect: "none" }}>
      <PerDayBadges />

      {!selectedBadge && !disabled && (
        <BadgeSelect
          value={selectedBadge?.id}
          onChange={(e): void =>
            setSelectedBadge(badgeOptions.find((b) => b.id === e.target.value))
          }
        >
          {badgeOptions.map((b) => {
            return <option value={b.id}>{b.label}</option>;
          })}
        </BadgeSelect>
      )}
      {selectedBadge && (
        <>
          <Button
            onClick={executor.execute}
            disabled={isLoading || !selectedBadge}
          >
            Give '{badgeDisplayName(selectedBadge)}'
          </Button>
          <Spacer h={8} />
          <Button
            onClick={(): void => {
              setSelectedBadge(undefined);
            }}
            style="outline"
            disabled={isLoading || !selectedBadge}
          >
            Cancel
          </Button>
          <Spacer h={8} />
        </>
      )}
    </div>
  );
}

const BadgeSelect = styled.select`
  width: 100%;
  cursor: pointer;
`;
