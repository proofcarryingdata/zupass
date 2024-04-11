import { PodboxTicketActionPreCheckResult } from "@pcd/passport-interface";
import { Dispatch, ReactNode, SetStateAction, useEffect } from "react";
import { Button, Spacer } from "../../../../../../core";
import { RippleLoader } from "../../../../../../core/RippleLoader";
import {
  ErrorContainer,
  StatusContainer
} from "../../../PodboxScannedTicketScreen";
import { useExecuteTicketAction } from "../useExecuteTicketAction";

export function ShareContactActionSection({
  ticketId,
  eventId,
  setIsLoading,
  isLoading,
  precheck
}: {
  ticketId: string;
  eventId: string;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  precheck: PodboxTicketActionPreCheckResult;
  isLoading: boolean;
}): ReactNode {
  const executor = useExecuteTicketAction({
    eventId,
    ticketId,
    action: {
      getContact: true
    }
  });

  useEffect(() => {
    setIsLoading(executor.loading);
  }, [executor.loading, setIsLoading]);

  if (
    !precheck.value?.success ||
    !precheck.value?.getContactActionInfo?.permissioned
  ) {
    // scanner can't issue contact to the scanee
    return null;
  }

  if (precheck.value?.getContactActionInfo?.alreadyReceived) {
    return (
      <>
        <StatusContainer size="small" disabled={isLoading}>
          Received Contact Card
        </StatusContainer>
        <Spacer h={8} />
      </>
    );
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

  if (executor.result?.success && executor.result?.value?.success) {
    return (
      <>
        <StatusContainer size="small" disabled={isLoading}>
          Received Contact Card
        </StatusContainer>
        <Spacer h={8} />
      </>
    );
  } else if (executor.result?.value?.success === false) {
    return (
      <>
        <ErrorContainer>😵 Couldn't Share Contact Card b</ErrorContainer>
        <Spacer h={8} />
      </>
    );
  }

  return (
    <>
      <Button onClick={executor.execute} disabled={isLoading}>
        Get Contact Card
      </Button>
      <Spacer h={8} />
    </>
  );
}
