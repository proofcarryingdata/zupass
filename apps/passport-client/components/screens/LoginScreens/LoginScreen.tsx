import { requestLogToServer } from "@pcd/passport-interface";
import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useState
} from "react";
import { appConfig } from "../../../src/appConfig";
import { useDispatch, useQuery, useSelf } from "../../../src/appHooks";
import {
  pendingAddRequestKey,
  pendingAddSubscriptionRequestKey,
  pendingGetWithoutProvingRequestKey,
  pendingProofRequestKey,
  pendingViewFrogCryptoRequestKey,
  pendingViewSubscriptionsRequestKey,
  setPendingAddRequest,
  setPendingAddSubscriptionRequest,
  setPendingGetWithoutProvingRequest,
  setPendingProofRequest,
  setPendingViewFrogCryptoRequest,
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
import { AppContainer } from "../../shared/AppContainer";
import { InlineError } from "../../shared/InlineError";

export function LoginScreen(): JSX.Element {
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
  const pendingViewFrogCryptoRequest = query?.get(
    pendingViewFrogCryptoRequestKey
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
    } else if (pendingViewFrogCryptoRequest != null) {
      setPendingViewFrogCryptoRequest(pendingViewFrogCryptoRequest);
      pendingRequestForLogging = pendingViewFrogCryptoRequestKey;
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
    pendingAddSubscriptionRequest,
    pendingViewFrogCryptoRequest
  ]);

  const self = useSelf();
  const [email, setEmail] = useState("");

  const onGenPass = useCallback(
    function (e: FormEvent<HTMLFormElement>) {
      e.preventDefault();
      const trimmedEmail = email.trim();

      if (trimmedEmail === "" || validateEmail(trimmedEmail) === false) {
        setError("Enter a valid email address");
      } else {
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
            <H2>ZUPASS</H2>
            <Spacer h={24} />
            To complete this request, you need to either log into your existing
            Zupass account, or create a new one.
          </TextCenter>
        </>
      ) : (
        <>
          <TextCenter>
            <H1>ZUPASS</H1>
            <Spacer h={24} />
            This is an experimental personal cryptography manager, powered by
            Zero-Knowledge.
          </TextCenter>
        </>
      )}

      <Spacer h={24} />

      <CenterColumn>
        <form onSubmit={onGenPass}>
          <BigInput
            autoCapitalize="off"
            autoCorrect="off"
            type="text"
            autoFocus
            placeholder="email address"
            value={email}
            onChange={useCallback(
              (e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value),
              [setEmail]
            )}
          />
          <InlineError error={error} />
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
