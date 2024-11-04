import { useLayoutEffect } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { AppContainer } from "../../../components/shared/AppContainer";
import { useLoadedIssuedPCDs } from "../../../src/appHooks";
import {
  clearAllPendingRequests,
  getPendingRequest
} from "../../../src/sessionStorage";
import { useSyncE2EEStorage } from "../../../src/useSyncE2EEStorage";
import { NewLoader } from "../../shared/NewLoader";
import { Typography } from "../../shared/Typography";

export function NewLoginInterstitialScreen(): JSX.Element {
  useSyncE2EEStorage();
  const navigate = useNavigate();
  const loadedIssuedPCDs = useLoadedIssuedPCDs();

  useLayoutEffect(() => {
    if (loadedIssuedPCDs) {
      const pendingRequest = getPendingRequest();
      if (pendingRequest) {
        switch (pendingRequest.key) {
          case "proof": {
            console.log("Redirecting to prove screen");
            const encReq = encodeURIComponent(pendingRequest.value);
            clearAllPendingRequests();
            navigate("/prove?request=" + encReq, { replace: true });
            break;
          }
          case "add": {
            console.log("Redirecting to add screen");
            const encReq = encodeURIComponent(pendingRequest.value);
            clearAllPendingRequests();
            navigate("/add?request=" + encReq + "&autoAdd=true", {
              replace: true
            });
            break;
          }
          case "halo": {
            console.log("Redirecting to halo screen");
            clearAllPendingRequests();
            navigate(`/halo${pendingRequest.value}`, { replace: true });
            break;
          }
          case "getWithoutProving": {
            console.log("Redirecting to get without proving screen");
            const encReq = encodeURIComponent(pendingRequest.value);
            clearAllPendingRequests();
            navigate(`/get-without-proving?request=${encReq}`, {
              replace: true
            });
            break;
          }
          case "viewSubscriptions": {
            console.log("Redirecting to view subscription screen");
            clearAllPendingRequests();
            navigate(`/subscriptions`, { replace: true });
            break;
          }
          case "addSubscription": {
            console.log("Redirecting to add subscription screen");
            const encReq = encodeURIComponent(JSON.parse(pendingRequest.value));
            clearAllPendingRequests();
            navigate(`/add-subscription?url=${encReq}`, { replace: true });
            break;
          }
          case "viewFrogCrypto": {
            console.log("Redirecting to frog crypto screen");
            const encReq = encodeURIComponent(JSON.parse(pendingRequest.value));
            clearAllPendingRequests();
            navigate(`/frogscriptions/${encReq}`, { replace: true });
            break;
          }
          case "genericIssuanceCheckin": {
            console.log("Redirecting to Generic Issuance checkin screen");
            const encReq = new URLSearchParams(
              JSON.parse(pendingRequest.value)
            ).toString();
            clearAllPendingRequests();
            navigate(`/generic-checkin?${encReq}`, {
              replace: true
            });
            break;
          }
          case "authenticateIFrame": {
            console.log("Redirecting to Authenticate IFrame screen");
            clearAllPendingRequests();
            navigate(`/authenticate-iframe`, {
              replace: true
            });
            break;
          }
          case "searchParams": {
            console.log(
              "Redirecting to home screen with search params",
              pendingRequest
            );
            clearAllPendingRequests();
            const encReq = JSON.parse(pendingRequest.value);
            navigate(`/${encReq}`, { replace: true });
            break;
          }
          default:
            window.location.hash = "#/";
        }
      }
    }
  }, [loadedIssuedPCDs, navigate]);

  // scroll to top when we navigate to this page
  useLayoutEffect(() => {
    document.body.scrollTop = document.documentElement.scrollTop = 0;
  }, []);

  return (
    <>
      <AppContainer bg="gray" fullscreen>
        <Container>
          <NewLoader columns={5} rows={5} />
          <Typography fontSize={18} fontWeight={800} color="#8B94AC">
            LOADING
          </Typography>
        </Container>
      </AppContainer>
    </>
  );
}

const Container = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
`;
