import { PodboxActionPreCheckResult } from "@pcd/passport-interface";
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
  precheck: PodboxActionPreCheckResult;
  isLoading: boolean;
}): ReactNode {
  const executor = useExecuteTicketAction({
    eventId,
    action: {
      shareContact: {
        recipientTicketId: ticketId
      }
    }
  });

  useEffect(() => {
    setIsLoading(executor.loading);
  }, [executor.loading, setIsLoading]);

  if (
    !precheck.value?.success ||
    !precheck.value?.shareContactActionInfo?.permissioned
  ) {
    // scanner can't issue contact to the scanee
    return null;
  }

  if (
    precheck.value?.shareContactActionInfo?.permissioned &&
    precheck.value?.shareContactActionInfo?.alreadyShared
  ) {
    return (
      <>
        <StatusContainer size="small" disabled={isLoading}>
          🪪 Contact Info Exchanged 🤝
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

  if (executor.result?.success) {
    return (
      <>
        <StatusContainer size="small" disabled={isLoading}>
          🪪 Contact Info Exchanged 🤝
        </StatusContainer>
        <Spacer h={8} />
      </>
    );
  } else if (executor.result?.error) {
    return (
      <>
        <ErrorContainer>😵 Couldn't Share Contact Card</ErrorContainer>
        <Spacer h={8} />
      </>
    );
  }

  return (
    <>
      <Button onClick={executor.execute} disabled={isLoading}>
        Share Contact
      </Button>
      <Spacer h={8} />
    </>
  );
}
