import { Spacer } from "@pcd/passport-ui";
import { useEffect } from "react";
import { RippleLoader } from "../../../../core/RippleLoader";
import { ErrorContainer, StatusContainer } from "../PodboxScannedTicketScreen";
import { PodboxTicketActionErrorSection } from "./actions/PodboxTicketErrors";
import { useExecuteTicketAction } from "./actions/useExecuteTicketAction";

export function InstantCheckin({
  ticketId,
  eventId
}: {
  ticketId: string;
  eventId: string;
}): JSX.Element {
  const executor = useExecuteTicketAction({
    eventId,
    ticketId,
    action: {
      checkin: true
    }
  });

  useEffect(() => {
    executor.execute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (executor.loading) {
    return (
      <>
        <RippleLoader />
        <Spacer h={8} />
      </>
    );
  }

  if (executor.result?.success) {
    const value = executor.result.value;
    if (value.success) {
      // For the richer "action executor" system used when camera-scanning, we
      // have different success messages. These are fetched from the pre-check
      // API, which we do not use here. However, since we can only do check-in,
      // it's OK that the message is hard-coded.
      const successMessage = "Checked In";
      return (
        <>
          <StatusContainer size="small">{successMessage}</StatusContainer>
        </>
      );
    } else {
      return <PodboxTicketActionErrorSection error={value.error} />;
    }
  } else if (executor.result?.error) {
    const errorMessage = "Error Checking Ticket In";
    return (
      <>
        <ErrorContainer>{errorMessage}</ErrorContainer>
        <div>
          {executor.result?.error ??
            "An unknown error occurred, please try again."}
        </div>
      </>
    );
  }

  return (
    <>
      <RippleLoader />
      <Spacer h={8} />
    </>
  );
}
