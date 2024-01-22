import { EmailPCDTypeName } from "@pcd/email-pcd";
import {
  CredentialManager,
  Feed,
  FeedSubscriptionManager,
  Subscription
} from "@pcd/passport-interface";
import {
  PCDPermission,
  isAppendToFolderPermission,
  isDeleteFolderPermission,
  isReplaceInFolderPermission
} from "@pcd/pcd-collection";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { appConfig } from "../../src/appConfig";
import {
  useCredentialCache,
  useDispatch,
  useIdentity,
  usePCDCollection,
  useQuery,
  useSelf,
  useSubscriptions,
  useUserForcedToLogout
} from "../../src/appHooks";
import { isDefaultSubscription } from "../../src/defaultSubscriptions";
import { saveSubscriptions } from "../../src/localstorage";
import {
  clearAllPendingRequests,
  pendingAddSubscriptionRequestKey,
  setPendingAddSubscriptionRequest
} from "../../src/sessionStorage";
import { useSyncE2EEStorage } from "../../src/useSyncE2EEStorage";
import { BigInput, Button, H2, Spacer } from "../core";
import { AppContainer } from "../shared/AppContainer";
import { ScreenNavigation } from "../shared/ScreenNavigation";
import { Spinner } from "../shared/Spinner";

const DEFAULT_FEEDS_URL = appConfig.zupassServer + "/feeds";

export function AddSubscriptionScreen() {
  useSyncE2EEStorage();
  const query = useQuery();
  const url = query?.get("url") ?? "";
  const [providerUrl, setProviderUrl] = useState(
    url.length > 0 ? url : DEFAULT_FEEDS_URL
  );
  const [infos, setInfos] = useState<Feed[] | undefined>();
  const [fetching, setFetching] = useState(false);
  const [fetchedProviderUrl, setFetchedProviderUrl] = useState<string | null>(
    null
  );
  const [fetchedProviderName, setFetchedProviderName] = useState<string | null>(
    null
  );
  const [fetchError, setFetchError] = useState<string | undefined>();
  const { value: subs } = useSubscriptions();
  const self = useSelf();
  const dispatch = useDispatch();
  const userForcedToLogout = useUserForcedToLogout();

  useEffect(() => {
    if (self == null || userForcedToLogout) {
      clearAllPendingRequests();
      const stringifiedRequest = JSON.stringify(url ?? "");
      setPendingAddSubscriptionRequest(stringifiedRequest);
      if (self == null) {
        window.location.href = `/#/login?redirectedFromAction=true&${pendingAddSubscriptionRequestKey}=${encodeURIComponent(
          stringifiedRequest
        )}`;
      }
    }
  }, [self, dispatch, url, userForcedToLogout]);

  const onFetchFeedsClick = useCallback(() => {
    if (fetching) {
      return;
    }

    setFetching(true);
    setFetchError(undefined);

    subs
      .listFeeds(providerUrl)
      .then((response) => {
        setFetching(false);
        setInfos(response.feeds);
        setFetchedProviderUrl(response.providerUrl);
        setFetchedProviderName(response.providerName);
        if (!subs.getProvider(response.providerUrl)) {
          subs.addProvider(response.providerUrl, response.providerName);
          saveSubscriptions(subs);
        }
      })
      .catch((e) => {
        console.log(`error fetching subscription infos ${e}`);
        setFetching(false);
        setFetchError(
          "Unable to fetch subscriptions. Check that the URL is correct, or try again later."
        );
      });
  }, [fetching, providerUrl, subs]);

  const alreadyFetched = fetchedProviderUrl === providerUrl;

  return (
    <AppContainer bg="gray">
      <ScreenNavigation label={"Subscriptions"} to="/subscriptions" />
      <SubscriptionsScreenContainer>
        <Spacer h={16} />
        <H2>Add subscription</H2>
        <Spacer h={16} />
        <div>Enter a URL to a feed provider:</div>
        <Spacer h={8} />
        <BigInput
          autoCorrect="off"
          autoCapitalize="off"
          disabled={fetching}
          value={providerUrl}
          onChange={(e) => {
            setProviderUrl(e.target.value);
          }}
        />
        <Spacer h={16} />
        <Button
          disabled={fetching || alreadyFetched}
          onClick={onFetchFeedsClick}
        >
          <Spinner show={fetching} text="Get possible subscriptions" />
        </Button>
        <Spacer h={16} />
        {fetchError && <SubscriptionErrors>{fetchError}</SubscriptionErrors>}
        <div>
          {infos &&
            infos.map((info, i) => (
              <React.Fragment key={i}>
                <Spacer h={16} />
                <SubscriptionInfoRow
                  subscriptions={subs}
                  providerUrl={fetchedProviderUrl}
                  providerName={fetchedProviderName}
                  info={info}
                  key={i}
                  showErrors={false}
                />
              </React.Fragment>
            ))}
        </div>
      </SubscriptionsScreenContainer>
    </AppContainer>
  );
}

export function SubscriptionInfoRow({
  subscriptions,
  providerUrl,
  providerName,
  info,
  showErrors
}: {
  subscriptions: FeedSubscriptionManager;
  providerUrl: string;
  providerName: string;
  info: Feed;
  showErrors: boolean;
}) {
  const existingSubscriptions =
    subscriptions.getSubscriptionsByProviderAndFeedId(providerUrl, info.id);
  const subscription = existingSubscriptions[0];
  const alreadySubscribed = existingSubscriptions.length > 0;
  const error = alreadySubscribed
    ? subscriptions.getError(subscription.id)
    : null;

  const dispatch = useDispatch();

  const openResolveErrorModal = useCallback(() => {
    dispatch({
      type: "resolve-subscription-error",
      subscriptionId: subscription.id
    });
  }, [dispatch, subscription]);

  return (
    <InfoRowContainer>
      <FeedName>{info.name}</FeedName>
      <Spacer h={8} />
      <Description>{info.description}</Description>
      <Spacer h={8} />
      <hr />
      <Spacer h={8} />
      {alreadySubscribed && showErrors && error && (
        <>
          <SubscriptionErrors>
            <div>
              Errors were encountered when processing this subscription.
            </div>
            <Spacer h={8} />
            <Button onClick={openResolveErrorModal}>Resolve</Button>
          </SubscriptionErrors>
          <Spacer h={8} />
        </>
      )}
      {alreadySubscribed ? (
        <AlreadySubscribed existingSubscription={existingSubscriptions[0]} />
      ) : (
        <SubscribeSection
          providerUrl={providerUrl}
          providerName={providerName}
          info={info}
        />
      )}
    </InfoRowContainer>
  );
}

function SubscribeSection({
  providerUrl,
  providerName,
  info
}: {
  providerUrl: string;
  providerName: string;
  info: Feed;
}) {
  const identity = useIdentity();
  const pcds = usePCDCollection();
  const dispatch = useDispatch();
  const credentialCache = useCredentialCache();

  const credentialManager = useMemo(
    () => new CredentialManager(identity, pcds, credentialCache),
    [credentialCache, identity, pcds]
  );

  // Check that we can actually generate the credential that the feed wants
  const missingCredentialPCD = !credentialManager.canGenerateCredential({
    signatureType: "sempahore-signature-pcd",
    pcdType: info.credentialRequest.pcdType
  });

  const onSubscribeClick = useCallback(() => {
    (async () => {
      dispatch({
        type: "add-subscription",
        providerUrl,
        providerName,
        feed: info
      });
    })();
  }, [providerUrl, info, dispatch, providerName]);

  const credentialHumanReadableName =
    info.credentialRequest.pcdType === EmailPCDTypeName ? "Verified Email" : "";

  // This UI should probably resemble the proving screen much more, giving
  // the user more information about what information will be disclosed in
  // the credential, and/or allowing configuration of the preferred
  // credential.

  return (
    <>
      {missingCredentialPCD && (
        <div>
          This feed requires a {credentialHumanReadableName} PCD, which you do
          not have.
        </div>
      )}
      {!missingCredentialPCD && (
        <div>
          This will send <strong>{providerName}</strong> your{" "}
          <strong>{credentialHumanReadableName}</strong> as a credential.
        </div>
      )}
      <Spacer h={8} />
      <div>This feed requires the following permissions:</div>
      <PermissionsView permissions={info.permissions} />
      <Spacer h={16} />
      <Button
        disabled={missingCredentialPCD}
        onClick={onSubscribeClick}
        size="small"
      >
        Subscribe
      </Button>
    </>
  );
}

export function PermissionsView({
  permissions
}: {
  permissions: PCDPermission[];
}) {
  return (
    <ul>
      {permissions.map((p, i) => (
        <SinglePermission key={i} permission={p} />
      ))}
    </ul>
  );
}

function SinglePermission({ permission }: { permission: PCDPermission }) {
  if (isAppendToFolderPermission(permission)) {
    return (
      <PermissionListItem>
        Append to folder <strong>{permission.folder}</strong>
      </PermissionListItem>
    );
  } else if (isReplaceInFolderPermission(permission)) {
    return (
      <PermissionListItem>
        Replace in folder <strong>{permission.folder}</strong>
      </PermissionListItem>
    );
  } else if (isDeleteFolderPermission(permission)) {
    return (
      <PermissionListItem>
        Delete folder <strong>{permission.folder}</strong>
      </PermissionListItem>
    );
  } else {
    return (
      <PermissionListItem>
        Unknown permission {permission["type"]}
      </PermissionListItem>
    );
  }
}

function AlreadySubscribed({
  existingSubscription
}: {
  existingSubscription: Subscription;
}) {
  const dispatch = useDispatch();
  const onUnsubscribeClick = useCallback(() => {
    if (
      window.confirm(
        `Are you sure you want to unsubscribe from ${existingSubscription.feed.name}?`
      )
    ) {
      dispatch({
        type: "remove-subscription",
        subscriptionId: existingSubscription.id
      });
    }
  }, [existingSubscription.feed.name, existingSubscription.id, dispatch]);

  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  };

  return (
    <div>
      {existingSubscription.ended && (
        <div>
          <strong>This feed is no longer active.</strong>
        </div>
      )}
      {!existingSubscription.ended && (
        <>
          <div>This feed has the following permissions:</div>
          <PermissionsView
            permissions={existingSubscription.feed.permissions}
          />
        </>
      )}
      <Spacer h={16} />
      You subscribed to this feed on{" "}
      {new Date(existingSubscription.subscribedTimestamp).toLocaleDateString(
        navigator.language,
        options
      )}
      <Spacer h={8} />
      {!isDefaultSubscription(existingSubscription) && (
        <Button onClick={onUnsubscribeClick} size="small" style="danger">
          Unsubscribe
        </Button>
      )}
    </div>
  );
}

const InfoRowContainer = styled.div`
  padding: 16px;
  border: 1px solid white;
  border-radius: 12px;
  background: var(--bg-lite-gray);
`;

const SubscriptionsScreenContainer = styled.div`
  padding-bottom: 16px;
  padding-top: 16px;
  width: 100%;
`;

const FeedName = styled.div`
  font-weight: bold;
  font-size: 18px;
`;

const Description = styled.p``;

const SubscriptionErrors = styled.div`
  border-radius: 16px;
  padding: 16px;
  background-color: var(--bg-dark-gray);
`;

const PermissionListItem = styled.li`
  margin-left: 14px;
  list-style-type: circle;
`;
