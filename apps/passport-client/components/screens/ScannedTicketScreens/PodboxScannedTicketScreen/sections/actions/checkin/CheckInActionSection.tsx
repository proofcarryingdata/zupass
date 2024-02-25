import { PodboxActionPreCheckResult } from "@pcd/passport-interface";
import { Dispatch, SetStateAction, useEffect } from "react";
import { Button, Spacer } from "../../../../../../core";
import { RippleLoader } from "../../../../../../core/RippleLoader";
import {
  ErrorContainer,
  StatusContainer
} from "../../../PodboxScannedTicketScreen";
import { PodboxTicketActionErrorSection } from "../PodboxTicketActionErrorSection";
import { useExecuteTicketAction } from "../useExecuteTicketAction";

/**
 * Given a Podbox ticket that Zupass has determined the curent user
 * has the ability to check in, renders a screen that allows the user
 * to perform a checkin of the scanned ticket.
 */
export function CheckInActionSection({
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
}): JSX.Element {
  const executor = useExecuteTicketAction({
    eventId,
    ticketId,
    action: {
      checkin: true
    }
  });

  useEffect(() => {
    setInProgress(executor.loading);
  }, [executor.loading, setInProgress]);

  const divider = (
    <div>
      <Spacer h={16} />
      <hr />
      <Spacer h={16} />
    </div>
  );

  if (
    !precheck.success ||
    !precheck.value.success ||
    !precheck.value.checkinActionInfo?.permissioned
  ) {
    return null;
  }

  if (precheck.success) {
    if (precheck.value?.checkinActionInfo.reason?.name === "AlreadyCheckedIn") {
      return (
        <div style={isLoading ? { opacity: 0.7 } : {}}>
          <PodboxTicketActionErrorSection
            error={precheck.value?.checkinActionInfo.reason}
          />
          <Spacer h={8} />
          <Button disabled={true}>Already Checked In</Button>
          {divider}
        </div>
      );
    }
  }

  if (executor.loading) {
    return (
      <>
        <RippleLoader />
        <Spacer h={8} />
      </>
    );
  }

  if (executor.result?.success) {
    return (
      <>
        <StatusContainer size="small">Checked In</StatusContainer>
        {divider}
      </>
    );
  } else if (executor.result?.error) {
    return (
      <>
        <ErrorContainer>Error Checking Ticket In</ErrorContainer>
        <div>{executor.result?.error}</div>
        {divider}
      </>
    );
  }

  return (
    <>
      <Button onClick={executor.execute} disabled={isLoading}>
        Check In
      </Button>
      {divider}
    </>
  );
}
