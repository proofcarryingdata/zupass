import { requestGenericIssuanceTicketPreviews } from "@pcd/passport-interface";
import { IPODTicketData } from "@pcd/pod-ticket-pcd";
import { TicketQR } from "@pcd/pod-ticket-pcd-ui";
import { ReactNode, useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import styled from "styled-components";
import { AppContainer } from "../../components/shared/AppContainer";
import { appConfig } from "../../src/appConfig";
import { useDispatch, useSelf } from "../../src/appHooks";
import { NewLoader } from "../shared/NewLoader";
import { Typography } from "../shared/Typography";

const TicketContainer = styled.div`
  border-radius: 16px;
  margin-top: 4px;
  background: var(--white);
  padding: 16px;
  /* shadow-sm */
  box-shadow: 0px 1px 2px 0px rgba(0, 0, 0, 0.05);
`;

const QRContainer = styled.div`
  max-width: 321px;
  max-height: 321px;
  height: 100%;
  width: 100%;
  margin: 0 auto;
`;

const Container = styled.div<{ backgroundImg?: string }>`
  padding: 20px;
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 28px;
  height: 100vh;
  // We might want to move this to the html tap so on desktop it will cover the screen
  ${({ backgroundImg }): string =>
    backgroundImg
      ? `background:
    linear-gradient(0deg, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0.5) 100%),
    url(${backgroundImg}) lightgray 50% / cover
      no-repeat;`
      : ""}
`;

const OneClickHeading = styled.div`
  color: #fff;
  text-align: center;
  font-family: Barlow, sans-serif;
  font-size: 28px;
  font-style: normal;
  font-weight: 800;
  padding-top: 30px;
`;
const OneClickSubHeader = styled.div`
  color: #c0d1ff;
  text-align: center;
  font-family: Rubik;
  font-size: 18px;
  font-style: normal;
  font-weight: 300;
`;

const OneClickButton = styled.button`
  border-radius: 24px;
  border: 2px solid #ffc971;
  background: linear-gradient(0deg, #ffae00 0%, #4cccb0 100%);
  height: 76.552px;
  width: 100%;

  color: #154133;
  text-align: center;
  font-family: "Fragment Mono";
  font-size: 28px;
  font-style: normal;
  font-weight: 400;
`;

const OneClickButtonBackground = styled.div`
  border-radius: 24px;
  background: #ad844f;
  padding-bottom: 8px;
`;

const LoadingScreenContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin: auto 0;
`;

const TextContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const OneClickTicket = ({ data }: { data: IPODTicketData }): JSX.Element => {
  return (
    <TicketContainer>
      <QRContainer>
        <TicketQR ticketData={data} idBasedVerifyURL="" />
      </QRContainer>
      <TextContainer>
        <Typography color="#9A4AC9" fontWeight={800} fontSize={20}>
          {/* TODO: add ticket type to pod ticket data (speaker, event orginizer, etc)*/}
          {data.attendeeEmail.toUpperCase()} {/* &middot; {data.ticketType} */}
        </Typography>
        <Typography>{data.attendeeName}</Typography>
        <Typography color="var(--text-tertiary)">{data.eventName}</Typography>
      </TextContainer>
    </TicketContainer>
  );
};

const redirectToTargetFolder = (): void => {
  window.location.hash = `#/`;
};

export const NewOneClickLoginScreen2 = (): JSX.Element | null => {
  const self = useSelf();
  const dispatch = useDispatch();
  const { email, code, targetFolder, pipelineId, serverUrl } = useParams();
  const [ticketPreviews, setTicketPreviews] = useState<IPODTicketData[]>([]);
  const [loading, setLoading] = useState(true);

  const handleLoadTicketPreviews = useCallback(async () => {
    if (!email || !code) {
      return;
    }
    try {
      const previewRes = await requestGenericIssuanceTicketPreviews(
        serverUrl ?? appConfig.zupassServer,
        email,
        code,
        pipelineId
      );

      setLoading(false);
      if (previewRes.success) {
        setTicketPreviews(previewRes.value.tickets);
      }
    } catch (err) {
      await dispatch({
        type: "error",
        error: {
          title: "An error occured",
          message: (err as Error).message || "An error occured"
        }
      });
    }
  }, [email, code, serverUrl, pipelineId, dispatch]);

  const handleOneClickLogin = useCallback(async () => {
    if (!email || !code) {
      return;
    }

    try {
      setLoading(true);
      await dispatch({
        type: "one-click-login",
        email,
        code,
        targetFolder
      });

      dispatch({
        type: "scroll-to-ticket",
        scrollTo: {
          attendee: ticketPreviews[0].attendeeEmail,
          eventId: ticketPreviews[0].eventId
        }
      });
    } catch (err) {
      setLoading(false);
      await dispatch({
        type: "error",
        error: {
          title: "An error occured",
          message: (err as Error).message || "An error occured"
        }
      });
    }
  }, [email, code, dispatch, targetFolder, ticketPreviews]);

  useEffect(() => {
    if (process.env.ONE_CLICK_LOGIN_ENABLED !== "true") {
      window.location.hash = "#/";
      return;
    }

    if (self) {
      if (!self.emails?.includes(email as string)) {
        alert(
          `You are already logged in as ${
            self.emails.length === 1
              ? self.emails?.[0]
              : "an account that owns the following email addresses: " +
                self.emails.join(", ")
          }. Please log out and try navigating to the link again.`
        );
        window.location.hash = "#/";
      } else {
        redirectToTargetFolder();
      }
    } else if (!email || !code) {
      window.location.hash = "#/";
    } else {
      handleLoadTicketPreviews();
    }
  }, [self, targetFolder, handleLoadTicketPreviews, email, code]);

  const textOrLoader = (text: string): ReactNode => {
    if (loading) return <NewLoader columns={3} rows={2} color="white" />;
    return text;
  };
  if (loading) {
    return (
      <AppContainer fullscreen={true} bg="gray">
        <LoadingScreenContainer>
          <NewLoader columns={5} rows={5} />
          <Typography
            fontSize={18}
            fontWeight={800}
            color="var(--text-tertiary)"
          >
            LOADING TICKET INFO
          </Typography>
        </LoadingScreenContainer>
      </AppContainer>
    );
  }

  const firstTicket = ticketPreviews[0];

  return (
    <AppContainer noPadding bg="gray">
      <Container backgroundImg={firstTicket.imageUrl}>
        <div>
          <OneClickHeading>{firstTicket.eventName}</OneClickHeading>
          <OneClickSubHeader>{`${
            firstTicket.eventLocation ? `${firstTicket.eventLocation} • ` : ""
          }${ticketPreviews.length} ticket${
            ticketPreviews.length > 1 ? "s" : ""
          }`}</OneClickSubHeader>
        </div>
        <OneClickButtonBackground>
          <OneClickButton onClick={handleOneClickLogin}>
            {textOrLoader("Continue to Zupass")}
          </OneClickButton>
        </OneClickButtonBackground>
        <OneClickTicket data={firstTicket} />
      </Container>
    </AppContainer>
  );
};
