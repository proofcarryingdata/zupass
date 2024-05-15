import { Spacer, styled } from "@pcd/passport-ui";
import { useEffect } from "react";
import { H2, TextCenter } from "../../../../core";
import { RippleLoader } from "../../../../core/RippleLoader";
import { ErrorContainer, StatusContainer } from "../PodboxScannedTicketScreen";
import { usePreCheckTicket } from "../hooks/usePrecheckTicket";
import { PodboxTicketInfoSection } from "./PodboxTicketInfoSection";
import { PodboxZKModeTicketInfoSection } from "./PodboxZKModeTicketInfoSection";
import { PodboxTicketActionErrorSection } from "./actions/PodboxTicketErrors";
import { useExecuteTicketAction } from "./actions/useExecuteTicketAction";

export function InstantCheckin({
  ticketId,
  eventId,
  zkMode
}: {
  ticketId: string;
  eventId: string;
  zkMode: boolean;
}): JSX.Element {
  const executor = useExecuteTicketAction({
    eventId,
    ticketId,
    action: {
      checkin: true
    }
  });

  const precheck = usePreCheckTicket(ticketId, eventId);

  const isLoading = executor.loading || precheck.loading;

  useEffect(() => {
    executor.execute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) {
    return (
      <>
        <RippleLoader />
        <Spacer h={8} />
      </>
    );
  }

  if (executor.result?.success && precheck.result.success) {
    const value = executor.result.value;
    if (value.success) {
      // For the richer "action executor" system used when camera-scanning, we
      // have different success messages. These are fetched from the pre-check
      // API, which we do not use here. However, since we can only do check-in,
      // it's OK that the message is hard-coded.
      const successMessage = "Checked In";
      return (
        <>
          {zkMode ? (
            <PodboxZKModeTicketInfoSection
              precheck={precheck.result.value}
              isLoading={isLoading}
            />
          ) : (
            <PodboxTicketInfoSection
              precheck={precheck.result.value}
              isLoading={isLoading}
            />
          )}
          <StatusContainer size="small">{successMessage}</StatusContainer>
          <LaserScannerInfo />
        </>
      );
    } else {
      return (
        <>
          <PodboxTicketActionErrorSection error={value.error} />
          <LaserScannerInfo />
        </>
      );
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
        <LaserScannerInfo />
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

function LaserScannerInfo(): JSX.Element {
  return (
    <>
      <Spacer h={64} />
      <TextCenter>
        <H2>Scan another ticket</H2>
      </TextCenter>
      <Spacer h={16} />
      <TextCenter>
        Press and hold down the <Orange>orange</Orange> scan button and position
        the attendee's QR code in front of the laser light. If you're having
        trouble, ask the participant to increase the brightness on their screen.
      </TextCenter>
      <Spacer h={16} />
      <TextCenter>
        Please reach out to the Zupass Help Desk for any further scanning
        issues.
      </TextCenter>
    </>
  );
}

const Orange = styled.span`
  font-weight: bold;
  color: orange;
`;
