import { requestGenericIssuanceTicketPreviews } from "@pcd/passport-interface";
import { Button, Spacer } from "@pcd/passport-ui";
import { IPODTicketData } from "@pcd/pod-ticket-pcd";
import { PODTicketCardBodyImpl } from "@pcd/pod-ticket-pcd-ui";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { appConfig } from "../../../src/appConfig";
import { useDispatch, useSelf } from "../../../src/appHooks";
import { MaybeModal } from "../../modals/Modal";
import { AppContainer } from "../../shared/AppContainer";
import {
  CardBodyContainer,
  CardHeader,
  CardOutlineExpanded
} from "../../shared/PCDCard";
import { ScreenLoader } from "../../shared/ScreenLoader";

/**
 * format: http://localhost:3000/#/one-click-login/:email/:code/:targetFolder/:pipelineId?/:serverUrl?
 * - `code` is the pretix or lemonade order code
 * - `email` is the email address of the ticket to whom the ticket was issued
 * - `targetFolder` is the folder to redirect to after login. optional.
 * example: http://localhost:3000/#/one-click-login/ivan@0xparc.org/123456/0xPARC%2520Summer%2520'24
 */
export function NewOneClickLoginScreen(): JSX.Element | null {
  const self = useSelf();
  const dispatch = useDispatch();
  const { email, code, targetFolder, pipelineId, serverUrl } = useParams();
  const [ticketPreviews, setTicketPreviews] = useState<IPODTicketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  const redirectToTargetFolder = useCallback(() => {
    if (targetFolder) {
      window.location.hash = `#/?folder=${encodeURIComponent(targetFolder)}`;
    } else {
      window.location.hash = "#/";
    }
  }, [targetFolder]);

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
      } else {
        setError(previewRes.error);
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
  }, [email, code, dispatch, targetFolder]);

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
  }, [
    self,
    targetFolder,
    handleLoadTicketPreviews,
    redirectToTargetFolder,
    email,
    code
  ]);

  return (
    <>
      <MaybeModal fullScreen />
      <AppContainer bg="primary">
        {loading && <ScreenLoader />}

        {error && <div>{error}</div>}

        {!loading && (
          <>
            <Spacer h={32} />

            {ticketPreviews.length === 0 ? (
              <div>No tickets found</div>
            ) : (
              <>
                {ticketPreviews.map((ticket, i) => (
                  <CardOutlineExpanded key={i}>
                    <CardBodyContainer>
                      <CardHeader isMainIdentity={true}>
                        {ticket.eventName} ({ticket.ticketName})
                      </CardHeader>
                      <PODTicketCardBodyImpl
                        defaultImage="images/zuzalu/zuzalu.png"
                        ticketData={ticket}
                        key={ticket.ticketId}
                      />
                    </CardBodyContainer>
                  </CardOutlineExpanded>
                ))}
                <Spacer h={16} />
              </>
            )}

            <Button onClick={handleOneClickLogin}>Continue to Zupass</Button>
          </>
        )}
      </AppContainer>
    </>
  );
}
