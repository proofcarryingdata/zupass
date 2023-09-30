import { requestLogToServer } from "@pcd/passport-interface";
import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useState
} from "react";
import styled from "styled-components";
import { appConfig } from "../../../src/appConfig";
import { useDispatch, useQuery, useSelf } from "../../../src/appHooks";
import {
  pendingAddRequestKey,
  pendingAddSubscriptionRequestKey,
  pendingGetWithoutProvingRequestKey,
  pendingProofRequestKey,
  pendingViewSubscriptionsRequestKey,
  setPendingAddRequest,
  setPendingAddSubscriptionRequest,
  setPendingGetWithoutProvingRequest,
  setPendingProofRequest,
  setPendingViewSubscriptionsRequest
} from "../../../src/sessionStorage";
import { validateEmail } from "../../../src/util";
import {
  BigInput,
  Button,
  CenterColumn,
  H1,
  H2,
  Spacer,
  TextCenter
} from "../../core";
import { ErrorMessage } from "../../core/error";
import { AppContainer } from "../../shared/AppContainer";

export function LoginScreen() {
  const dispatch = useDispatch();
  const [error, setError] = useState<string | undefined>();
  const query = useQuery();
  const redirectedFromAction = query?.get("redirectedFromAction") === "true";

  const pendingGetWithoutProvingRequest = query?.get(
    pendingGetWithoutProvingRequestKey
  );
  const pendingAddRequest = query?.get(pendingAddRequestKey);
  const pendingProveRequest = query?.get(pendingProofRequestKey);
  const pendingViewSubscriptionsRequest = query?.get(
    pendingViewSubscriptionsRequestKey
  );
  const pendingAddSubscriptionRequest = query?.get(
    pendingAddSubscriptionRequestKey
  );

  useEffect(() => {
    let pendingRequestForLogging: string | undefined = undefined;

    if (pendingGetWithoutProvingRequest != null) {
      setPendingGetWithoutProvingRequest(pendingGetWithoutProvingRequest);
      pendingRequestForLogging = pendingGetWithoutProvingRequestKey;
    } else if (pendingAddRequest != null) {
      setPendingAddRequest(pendingAddRequest);
      pendingRequestForLogging = pendingAddRequestKey;
    } else if (pendingProveRequest != null) {
      setPendingProofRequest(pendingProveRequest);
      pendingRequestForLogging = pendingProofRequestKey;
    } else if (pendingViewSubscriptionsRequest != null) {
      setPendingViewSubscriptionsRequest(pendingViewSubscriptionsRequest);
      pendingRequestForLogging = pendingViewSubscriptionsRequestKey;
    } else if (pendingAddSubscriptionRequest != null) {
      setPendingAddSubscriptionRequest(pendingAddSubscriptionRequest);
      pendingRequestForLogging = pendingAddSubscriptionRequestKey;
    }

    if (pendingRequestForLogging != null) {
      requestLogToServer(appConfig.zupassServer, "login-with-pending", {
        pending: pendingRequestForLogging
      });
    }
  }, [
    pendingGetWithoutProvingRequest,
    pendingAddRequest,
    pendingProveRequest,
    pendingViewSubscriptionsRequest,
    pendingAddSubscriptionRequest
  ]);

  const self = useSelf();
  const [email, setEmail] = useState("");

  const onGenPass = useCallback(
    function (e: FormEvent<HTMLFormElement>) {
      e.preventDefault();

      if (email === "") {
        setError("Enter an email address to continue.");
      } else if (validateEmail(email) === false) {
        setError("Enter a valid email address to continue.");
      } else {
        dispatch({
          type: "new-passport",
          email: email.toLocaleLowerCase("en-US")
        });
      }
    },
    [dispatch, email]
  );

  useEffect(() => {
    // Redirect to home if already logged in
    if (self != null) {
      window.location.hash = "#/";
    }
  }, [self]);

  return (
    <AppContainer bg="primary">
      <Spacer h={64} />
      {redirectedFromAction ? (
        <>
          <TextCenter>
            <H2>LOGIN</H2>
          </TextCenter>
          <Spacer h={32} />
          <TextCenter>
            To complete this request, you need to either log into your existing
            Zupass account, or create a new one.
          </TextCenter>
        </>
      ) : (
        <>
          <TextCenter>
            <H1>ZUPASS</H1>
            <Spacer h={24} />
            <Description>
              This is an experimental personal cryptography manager, powered by
              Zero-Knowledge.
            </Description>
          </TextCenter>
        </>
      )}

      <Spacer h={24} />

      <CenterColumn>
        <form onSubmit={onGenPass}>
          <BigInput
            type="text"
            autoFocus
            placeholder="your email address"
            value={email}
            onChange={useCallback(
              (e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value),
              [setEmail]
            )}
          />
          {error && (
            <>
              <Spacer h={16} />
              <ErrorMessage>{error}</ErrorMessage>
              <Spacer h={8} />
            </>
          )}
          <Spacer h={8} />
          <Button style="primary" type="submit">
            Continue
          </Button>
        </form>
      </CenterColumn>
      <Spacer h={64} />
    </AppContainer>
  );
}

const Description = styled.p`
  font-weight: 300;
  width: 220px;
  margin: 0 auto;
`;
