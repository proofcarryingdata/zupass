import { PodboxTicketActionPreCheckResult } from "@pcd/passport-interface";
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
  precheck: PodboxTicketActionPreCheckResult;
  isLoading: boolean;
}): JSX.Element | null {
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

  if (
    !precheck.success ||
    !precheck.value.success ||
    !precheck.value.checkinActionInfo?.permissioned
  ) {
    return null;
  }

  if (precheck.success) {
    if (precheck.value?.checkinActionInfo.reason?.name === "AlreadyCheckedIn") {
      const errorMessage = precheck.value.actionScreenConfig?.actionErrorCopy
        ? precheck.value.actionScreenConfig?.actionErrorCopy
        : "Already Checked In";

      return (
        <div style={isLoading ? { opacity: 0.7 } : {}}>
          <PodboxTicketActionErrorSection
            uiConfig={precheck.value.actionScreenConfig}
            error={precheck.value?.checkinActionInfo.reason}
          />
          <Spacer h={8} />
          <Button disabled={true}>{errorMessage}</Button>
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
    const successMessage = precheck?.value?.actionScreenConfig
      ?.actionSuccessCopy
      ? precheck.value.actionScreenConfig.actionSuccessCopy
      : "Checked In";
    return (
      <>
        <StatusContainer size="small">{successMessage}</StatusContainer>
      </>
    );
  } else if (executor.result?.error) {
    const errorMessage = precheck?.value?.actionScreenConfig?.actionErrorCopy
      ? precheck.value.actionScreenConfig.actionErrorCopy
      : "Checked In";
    return (
      <>
        <ErrorContainer>{errorMessage}</ErrorContainer>
        <div>{executor.result?.error}</div>
      </>
    );
  }

  const buttonCopy = precheck?.value?.actionScreenConfig?.actionButtonCopy
    ? precheck.value.actionScreenConfig.actionButtonCopy
    : "Check In";

  return (
    <>
      <Button onClick={executor.execute} disabled={isLoading}>
        {buttonCopy}
      </Button>
    </>
  );
}
