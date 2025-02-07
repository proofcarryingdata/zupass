import { requestLogToServer } from "@pcd/passport-interface";
import { validateEmail } from "@pcd/util";
import { FormEvent, useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import { AppContainer } from "../../../components/shared/AppContainer";
import { appConfig } from "../../../src/appConfig";
import {
  useDispatch,
  useQuery,
  useSelf,
  useStateContext
} from "../../../src/appHooks";
import {
  pendingRequestKeys,
  setPendingAddRequest,
  setPendingAddSubscriptionRequest,
  setPendingClaimTicketRequest,
  setPendingGenericIssuanceCheckinRequest,
  setPendingGetWithoutProvingRequest,
  setPendingProofRequest,
  setPendingViewFrogCryptoRequest,
  setPendingViewSubscriptionsRequest
} from "../../../src/sessionStorage";
import { Button2 } from "../../shared/Button";
import { Input2 } from "../../shared/Input";
import {
  LoginContainer,
  LoginForm,
  LoginTitleContainer
} from "../../shared/Login/LoginComponents";
import { NewLoader } from "../../shared/NewLoader";
import { Typography } from "../../shared/Typography";

export const NewLoginScreen = (): JSX.Element => {
  const dispatch = useDispatch();
  const state = useStateContext().getState();
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const query = useQuery();
  const redirectedFromAction = query?.get("redirectedFromAction") === "true";

  const pendingGetWithoutProvingRequest = query?.get(
    pendingRequestKeys.getWithoutProving
  );
  const pendingAddRequest = query?.get(pendingRequestKeys.add);
  const pendingProveRequest = query?.get(pendingRequestKeys.proof);
  const pendingViewSubscriptionsRequest = query?.get(
    pendingRequestKeys.viewSubscriptions
  );
  const pendingAddSubscriptionRequest = query?.get(
    pendingRequestKeys.addSubscription
  );
  const pendingViewFrogCryptoRequest = query?.get(
    pendingRequestKeys.viewFrogCrypto
  );
  const pendingGenericIssuanceCheckinRequest = query?.get(
    pendingRequestKeys.genericIssuanceCheckin
  );
  const pendingClaimTicketRequest = query?.get(pendingRequestKeys.claimTicket);

  useEffect(() => {
    let pendingRequestForLogging: string | undefined = undefined;

    if (pendingGetWithoutProvingRequest) {
      setPendingGetWithoutProvingRequest(pendingGetWithoutProvingRequest);
      pendingRequestForLogging = pendingRequestKeys.getWithoutProving;
    } else if (pendingAddRequest) {
      setPendingAddRequest(pendingAddRequest);
      pendingRequestForLogging = pendingRequestKeys.add;
    } else if (pendingProveRequest) {
      setPendingProofRequest(pendingProveRequest);
      pendingRequestForLogging = pendingRequestKeys.proof;
    } else if (pendingViewSubscriptionsRequest) {
      setPendingViewSubscriptionsRequest(pendingViewSubscriptionsRequest);
      pendingRequestForLogging = pendingRequestKeys.viewSubscriptions;
    } else if (pendingAddSubscriptionRequest) {
      setPendingAddSubscriptionRequest(pendingAddSubscriptionRequest);
      pendingRequestForLogging = pendingRequestKeys.addSubscription;
    } else if (pendingViewFrogCryptoRequest) {
      setPendingViewFrogCryptoRequest(pendingViewFrogCryptoRequest);
      pendingRequestForLogging = pendingRequestKeys.viewFrogCrypto;
    } else if (pendingGenericIssuanceCheckinRequest) {
      setPendingGenericIssuanceCheckinRequest(
        pendingGenericIssuanceCheckinRequest
      );
      pendingRequestForLogging = pendingRequestKeys.genericIssuanceCheckin;
    } else if (pendingClaimTicketRequest) {
      setPendingClaimTicketRequest(pendingClaimTicketRequest);
      pendingRequestForLogging = pendingRequestKeys.claimTicket;
    }

    if (pendingRequestForLogging) {
      requestLogToServer(appConfig.zupassServer, "login-with-pending", {
        pending: pendingRequestForLogging
      });
    }
  }, [
    pendingGetWithoutProvingRequest,
    pendingAddRequest,
    pendingProveRequest,
    pendingViewSubscriptionsRequest,
    pendingAddSubscriptionRequest,
    pendingViewFrogCryptoRequest,
    pendingGenericIssuanceCheckinRequest,
    pendingClaimTicketRequest
  ]);

  const suggestedEmail = query?.get("email");

  const self = useSelf();
  const [email, setEmail] = useState(suggestedEmail ?? "");

  const onGenPass = useCallback(
    function (e: FormEvent<HTMLFormElement>) {
      e.preventDefault();
      const trimmedEmail = email.trim();

      if (trimmedEmail === "" || validateEmail(trimmedEmail) === false) {
        setError("Enter a valid email address");
      } else {
        setLoading(true);
        dispatch({
          type: "new-passport",
          email: trimmedEmail.toLocaleLowerCase("en-US")
        });
      }
    },
    [dispatch, email]
  );

  useEffect(() => {
    // Redirect to home if already logged in
    if (self) {
      window.location.hash = "#/";
    }
  }, [self]);

  if (state.loggingOut) {
    return (
      <AppContainer bg="gray" fullscreen>
        <LogoutContainer>
          <NewLoader columns={5} rows={5} />
          <Typography fontSize={18} fontWeight={800} color="#8B94AC">
            LOGGING OUT
          </Typography>
        </LogoutContainer>
      </AppContainer>
    );
  }

  return (
    <AppContainer bg="gray" fullscreen>
      <LoginContainer>
        <LoginTitleContainer>
          <Typography fontSize={24} fontWeight={800} color="#1E2C50">
            WELCOME TO ZUPASS
          </Typography>
          <Typography
            fontSize={16}
            fontWeight={400}
            color="#1E2C50"
            family="Rubik"
          >
            {redirectedFromAction
              ? "To complete this request, please login or register with your email below."
              : "Zupass is a new application powered by Programmable Cryptography. It's a stepping stone towards building the next internet."}
          </Typography>
        </LoginTitleContainer>
        <LoginForm onSubmit={onGenPass}>
          <Input2
            autoCapitalize="off"
            autoCorrect="off"
            type="text"
            autoFocus
            placeholder="Email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(undefined);
            }}
            error={error}
            disabled={loading}
          />
          <Button2 type="submit" disabled={loading}>
            {loading ? "Verifying" : "Enter"}
          </Button2>
        </LoginForm>
      </LoginContainer>
    </AppContainer>
  );
};

const LogoutContainer = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
`;
