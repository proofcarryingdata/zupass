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
import { BigInput, Button, Spacer } from "../core";
import { AppContainer } from "../shared/AppContainer";
import { ScreenNavigation } from "../shared/ScreenNavigation";
import { Spinner } from "../shared/Spinner";

const DEFAULT_FEEDS_URL = appConfig.zupassServer + "/feeds";

export function AddSubscriptionScreen(): JSX.Element {
  useSyncE2EEStorage();
  const query = useQuery();
  const url = query?.get("url") ?? "";
  // When mailing out subscription links, senders can include a "suggested"
  // email. If the user is not logged in, they will be prompted to sign up
  // using that email. If the user is logged in, they will be warned that the
  // feed may not give them the PCDs they expect.
  const suggestedEmail = query?.get("email");
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
  const [mismatchedEmails, setMismatchedEmails] = useState<boolean>(false);

  useEffect(() => {
    if (self == null || userForcedToLogout) {
      clearAllPendingRequests();
      const stringifiedRequest = JSON.stringify(url ?? "");
      setPendingAddSubscriptionRequest(stringifiedRequest);
      const emailParameter = suggestedEmail
        ? `&email=${encodeURIComponent(suggestedEmail)}`
        : "";
      if (self == null) {
        window.location.href = `/#/login?redirectedFromAction=true&${pendingAddSubscriptionRequestKey}=${encodeURIComponent(
          stringifiedRequest
        )}${emailParameter}`;
      }
    } else {
      if (
        suggestedEmail &&
        self.email.trim().toLocaleLowerCase() !==
          suggestedEmail.trim().toLocaleLowerCase()
      ) {
        // User is logged in, but they probably got this subscription link from an email for a different address
        setMismatchedEmails(true);
      }
    }
  }, [self, dispatch, url, userForcedToLogout, suggestedEmail]);

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

  useEffect(() => {
    const url = query?.get("url") ?? "";
    // If a URL was specified in the query string, automatically fetch feeds for it
    if (url.length > 0 && !fetchError && !fetchedProviderUrl) {
      onFetchFeedsClick();
    }
  }, [
    fetchError,
    fetchedProviderUrl,
    fetching,
    onFetchFeedsClick,
    providerUrl,
    query,
    subs
  ]);

  const alreadyFetched = fetchedProviderUrl === providerUrl;

  return (
    <AppContainer bg="gray">
      <ScreenNavigation label={"Subscriptions"} to="/subscriptions" />
      <SubscriptionsScreenContainer>
        <Spacer h={16} />
        <p>
          You can subscribe to PCD feeds hosted on the internet. PCD feeds ask
          your Zupass to prove your identity, or prove that you are logged into
          Zupass with a particular email address, and use that information,
          encoded as a PCD, to determine what new PCDs to give you.
        </p>

        {mismatchedEmails && (
          <MismatchedEmailWarning>
            <Spacer h={16} />
            <p>
              Your email is <strong>{self.email}</strong> but the subscription
              link was sent to <strong>{suggestedEmail}</strong>.
            </p>
            <p>
              This may mean that you cannot receive the expected PCDs. You may
              be able to contact the issuer to change the email address to{" "}
              <strong>{self.email}</strong>, or sign up for a new Zupass account
              with <strong>{suggestedEmail}</strong>.
            </p>
          </MismatchedEmailWarning>
        )}

        {fetchError ||
          (url.length === 0 && (
            <>
              <Spacer h={16} />
              <div>Enter a URL to a feed provider:</div>
              <Spacer h={8} />
              <BigInput
                autoCorrect="off"
                autoCapitalize="off"
                disabled={fetching}
                value={providerUrl}
                onChange={(e): void => {
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
            </>
          ))}
        <Spacer h={8} />

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
}): JSX.Element {
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

  const [moreInfo, setMoreInfo] = useState(false);

  const containerStyle: React.CSSProperties = moreInfo
    ? {
        border: "1px solid white",
        padding: "16px",
        borderRadius: "16px",
        backgroundColor: "rgba(255, 255, 255, 0.05)"
      }
    : {};

  return (
    <InfoRowContainer style={containerStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          maxWidth: "100%"
        }}
      >
        <FeedName
          style={
            moreInfo
              ? {
                  fontWeight: "bold"
                }
              : {}
          }
        >
          {info.name}
        </FeedName>
        <div style={{ flexShrink: "0" }}>
          <Button size="xs" onClick={(): void => setMoreInfo((more) => !more)}>
            {moreInfo ? "Less Info" : "More Info"}
          </Button>
        </div>
      </div>

      <Spacer h={8} />
      <Description>{info.description}</Description>
      {moreInfo ? (
        <>
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
            <AlreadySubscribed
              existingSubscription={existingSubscriptions[0]}
            />
          ) : (
            <SubscribeSection
              providerUrl={providerUrl}
              providerName={providerName}
              info={info}
            />
          )}
        </>
      ) : (
        <></>
      )}
    </InfoRowContainer>
  );
}

const MoreInfoContainer = styled.div`
  background-color: green;
`;

function SubscribeSection({
  providerUrl,
  providerName,
  info
}: {
  providerUrl: string;
  providerName: string;
  info: Feed;
}): JSX.Element {
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
    (async (): Promise<void> => {
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
}): JSX.Element {
  return (
    <ul>
      {permissions.map((p, i) => (
        <SinglePermission key={i} permission={p} />
      ))}
    </ul>
  );
}

function SinglePermission({
  permission
}: {
  permission: PCDPermission;
}): JSX.Element {
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
}): JSX.Element {
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
          {existingSubscription.ended_message && (
            <>
              <Spacer h={8} />
              <p>{existingSubscription.ended_message}</p>
            </>
          )}
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
        <Button onClick={onUnsubscribeClick} size="xs" style="danger">
          Unsubscribe
        </Button>
      )}
    </div>
  );
}

const InfoRowContainer = styled.div`
  padding-top: 8px;
`;

const ExpandButtonContainer = styled.div``;

const SubscriptionsScreenContainer = styled.div`
  padding-bottom: 16px;
  padding-top: 16px;
  width: 100%;
`;

const FeedName = styled.div`
  font-weight: bold;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding-right: 16px;
  box-sizing: border-box;
  overflow: hidden;
  flex-shrink: 1;
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

const MismatchedEmailWarning = styled.div`
  p {
    margin-bottom: 16px;
  }
`;
