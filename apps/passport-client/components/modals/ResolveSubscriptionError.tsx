import {
  CredentialManager,
  FeedSubscriptionManager,
  Subscription,
  SubscriptionErrorType,
  SubscriptionFetchError,
  SubscriptionPermissionError
} from "@pcd/passport-interface";
import { Spacer } from "@pcd/passport-ui";
import { PCDPermission, matchActionToPermission } from "@pcd/pcd-collection";
import { useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import {
  useCredentialCache,
  useDispatch,
  useIdentity,
  usePCDCollection,
  useResolvingSubscriptionId,
  useSubscriptions
} from "../../src/appHooks";
import { Button, H2 } from "../core";
import { PermissionsView } from "../screens/AddSubscriptionScreen";
import { Spinner } from "../shared/Spinner";

export function ResolveSubscriptionErrorModal(): JSX.Element {
  const subscriptions = useSubscriptions().value;
  const id = useResolvingSubscriptionId();
  const subscription = subscriptions.getSubscription(id);
  const error = subscriptions.getError(id);

  const dispatch = useDispatch();
  const finish = useCallback(() => {
    dispatch({ type: "set-modal", modal: { modalType: "none" } });
  }, [dispatch]);

  return (
    <ErrorContainer>
      <H2>{error ? "Subscription error" : "Subscription updated"}</H2>
      <Spacer h={24} />
      {error && error.type === SubscriptionErrorType.FetchError && (
        <FetchError subscription={subscription} subscriptions={subscriptions} />
      )}
      {error && error.type === SubscriptionErrorType.PermissionError && (
        <PermissionError
          subscription={subscription}
          subscriptions={subscriptions}
          error={error}
        />
      )}
      {!error && (
        <>
          <div>
            Your subscription to <strong>{subscription.feed.name}</strong> is
            up-to-date and working.
          </div>
          <Spacer h={16} />
          <Button onClick={finish}>Finish</Button>
        </>
      )}
    </ErrorContainer>
  );
}

function FetchError({
  subscription,
  subscriptions
}: {
  subscription: Subscription;
  subscriptions: FeedSubscriptionManager;
}): JSX.Element {
  const [polling, setPolling] = useState<boolean>(false);
  const [stillFailing, setStillFailing] = useState<boolean>(false);
  const [error, setError] = useState<SubscriptionFetchError>();
  const credentialCache = useCredentialCache();

  const identity = useIdentity();
  const pcds = usePCDCollection();

  const onRefreshClick = useCallback(async () => {
    setPolling(true);

    const credentialManager = new CredentialManager(
      identity,
      pcds,
      credentialCache
    );
    await subscriptions.pollSingleSubscription(subscription, credentialManager);
    setPolling(false);
    const error = subscriptions.getError(subscription.id);
    if (error && error.type === SubscriptionErrorType.FetchError) {
      setStillFailing(true);
      setError(error);
    } else {
      setStillFailing(false);
      setError(undefined);
    }
  }, [identity, pcds, credentialCache, subscriptions, subscription]);

  return (
    <div>
      <div>
        Could not load the feed. This may be due to poor network connectivity,
        or because the feed is unavailable.
      </div>
      {error?.e?.message && (
        <>
          <Spacer h={16} />
          <div>{error?.e?.message}</div>
        </>
      )}
      <Spacer h={16} />
      <Button disabled={polling} onClick={onRefreshClick}>
        <Spinner text="Refresh feed" show={polling} />
      </Button>
      <Spacer h={16} />
      {stillFailing && (
        <div>Still unable to load the feed. Please try again later.</div>
      )}
    </div>
  );
}

function PermissionError({
  subscription,
  subscriptions,
  error
}: {
  subscription: Subscription;
  subscriptions: FeedSubscriptionManager;
  error: SubscriptionPermissionError;
}): JSX.Element {
  // We got here because the feed served an action for which permission has
  // not been granted. This has two possible causes:
  // 1. The feed has added new permissions since the subscription was
  //    created, and the user should be allowed to grant these.
  // 2. The feed is erroneously serving actions for which it is not asking
  //    permission. In this case, we should not ask the user to grant them.
  // Therefore, our first step is to check what permissions the feed is
  // requesting.
  const [checkingPermissions, setCheckingPermissions] = useState<boolean>(true);
  const [newPermissions, setNewPermissions] = useState<PCDPermission[]>([]);
  const [checkFailure, setCheckFailure] = useState<
    "" | "fetch-failed" | "bad-permissions"
  >("");

  useEffect(() => {
    setCheckingPermissions(true);

    async function checkPermissions(): Promise<void> {
      try {
        const response = await subscriptions.listFeeds(
          subscription.providerUrl
        );
        const feed = response.feeds.find((f) => f.id === subscription.feed.id);

        if (feed) {
          // Would these permissions permit the actions?
          let newPermissionsAreGood = true;
          for (const action of error.actions) {
            if (!matchActionToPermission(action, feed.permissions)) {
              newPermissionsAreGood = false;
              break;
            }
          }

          if (newPermissionsAreGood) {
            // prompt the user to update
            setNewPermissions(feed.permissions);
          } else {
            // The new permissions would not permit the requested action.
            // This is almost certainly a problem with the feed, and can't
            // be resolved by the user.
            setCheckFailure("bad-permissions");
          }
        } else {
          // The feed was not returned in the list from the server.
          setCheckFailure("fetch-failed");
        }
      } catch (e) {
        // We couldn't fetch the feed from the server.
        setCheckFailure("fetch-failed");
      } finally {
        setCheckingPermissions(false);
      }
    }

    checkPermissions();
  }, [
    setCheckingPermissions,
    subscriptions,
    subscription.providerUrl,
    subscription.feed.id,
    error.actions
  ]);

  return (
    <div>
      <Spacer h={16} />
      {checkingPermissions && (
        <>
          <div>
            <strong>{subscription.feed.name}</strong> may require additional
            permissions.
          </div>
          <PermissionCheck>Checking permissions, please wait.</PermissionCheck>
        </>
      )}
      {!checkingPermissions && newPermissions.length > 0 && (
        <PermissionUpdate
          subscription={subscription}
          newPermissions={newPermissions}
        />
      )}
      {!checkingPermissions && checkFailure === "bad-permissions" && (
        <div>
          <p>
            <strong>{subscription.feed.name}</strong> could not be updated.
          </p>
          <p>Please try again later.</p>
        </div>
      )}
      {!checkingPermissions && checkFailure === "fetch-failed" && (
        <div>
          <p>
            <strong>{subscription.feed.name}</strong> could not be updated.
          </p>
          <p>Please try again later.</p>
        </div>
      )}
    </div>
  );
}

/**
 * If the feed is requesting new permissions, present the user with the
 * complete updated permissions list and ask them to approve it.
 */
function PermissionUpdate({
  subscription,
  newPermissions
}: {
  subscription: Subscription;
  newPermissions: PCDPermission[];
}): JSX.Element {
  const [outcome, setOutcome] = useState<"fail" | "success" | "">("");
  const dispatch = useDispatch();

  const onUpdateClick = useCallback(async () => {
    try {
      dispatch({
        type: "update-subscription-permissions",
        subscriptionId: subscription.id,
        permissions: newPermissions
      });
      setOutcome("success");
    } catch (e) {
      setOutcome("fail");
    }
  }, [newPermissions, subscription.id, dispatch]);

  const finish = useCallback(() => {
    dispatch({ type: "set-modal", modal: { modalType: "none" } });
  }, [dispatch]);

  return (
    <div>
      {outcome === "" && (
        <>
          <div>
            <strong>{subscription.feed.name}</strong> requires the following
            permissions:
          </div>
          <Spacer h={8} />
          <PermissionsView permissions={newPermissions} />
          <Spacer h={16} />
          <div>
            Declining these permissions will not affect your existing PCDs but
            may prevent new PCDs from being added.
          </div>
          <Spacer h={16} />
          <ButtonGroup>
            <Button onClick={onUpdateClick} size="small">
              Approve
            </Button>
            <Button onClick={finish} size="small">
              Cancel
            </Button>
          </ButtonGroup>
        </>
      )}
      {outcome === "fail" && (
        <div>
          We were unable to update permissions for{" "}
          <strong>{subscription.feed.name}</strong>. Please try again later.
        </div>
      )}
      {outcome === "success" && (
        <>
          <div>Subscription updated!</div>
          <Spacer h={16} />
          <Button onClick={finish}>Finish</Button>
        </>
      )}
    </div>
  );
}

const PermissionCheck = styled.div`
  width: 100%;
  font-weight: bold;
`;

const ErrorContainer = styled.div`
  padding: 16px;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 16px;
`;
