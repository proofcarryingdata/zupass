import { EmailPCDPackage, EmailPCDTypeName } from "@pcd/email-pcd";
import {
  Feed,
  FeedSubscriptionManager,
  ISSUANCE_STRING,
  Subscription
} from "@pcd/passport-interface";
import {
  PCDPermission,
  isAppendToFolderPermission,
  isReplaceInFolderPermission
} from "@pcd/pcd-collection";
import {
  ArgumentTypeName,
  PCD,
  PCDPackage,
  SerializedPCD
} from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd/";
import React, { useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import { appConfig } from "../../src/appConfig";
import {
  useDispatch,
  useIdentity,
  usePCDCollection,
  useQuery,
  useSelf,
  useSubscriptions
} from "../../src/appHooks";
import { isDefaultSubscription } from "../../src/defaultSubscriptions";
import {
  clearAllPendingRequests,
  pendingAddSubscriptionRequestKey,
  setPendingAddSubscriptionRequest
} from "../../src/sessionStorage";
import { BigInput, Button, H2, Spacer } from "../core";
import { AppContainer } from "../shared/AppContainer";
import { Spinner } from "../shared/Spinner";
import { SubscriptionNavigation } from "../shared/SubscriptionNavigation";

const DEFAULT_FEEDS_URL = appConfig.passportServer + "/feeds";

export function AddSubscriptionScreen() {
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

  useEffect(() => {
    if (self == null) {
      clearAllPendingRequests();
      const stringifiedRequest = JSON.stringify(url ?? "");
      setPendingAddSubscriptionRequest(stringifiedRequest);
      window.location.href = `/#/login?redirectedFromAction=true&${pendingAddSubscriptionRequestKey}=${encodeURIComponent(
        stringifiedRequest
      )}`;
    }
  }, [self, dispatch, url]);

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
      <SubscriptionNavigation
        label={"Subscriptions"}
        to="/subscriptions"
      ></SubscriptionNavigation>
      <SubscriptionsScreenContainer>
        <Spacer h={16} />
        <H2>Add subscription</H2>
        <Spacer h={16} />
        <div>Enter a URL to a feed provider:</div>
        <Spacer h={8} />
        <BigInput
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
                  credential={undefined}
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
  credential,
  showErrors
}: {
  subscriptions: FeedSubscriptionManager;
  providerUrl: string;
  providerName: string;
  info: Feed;
  credential: SerializedPCD | undefined;
  showErrors: boolean;
}) {
  const existingSubscriptions =
    subscriptions.getSubscriptionsByProviderAndFeedId(providerUrl, info.id);
  const subscription = existingSubscriptions[0];
  const alreadySubscribed = existingSubscriptions.length > 0;
  const error = alreadySubscribed
    ? subscriptions.getError(subscription.id)
    : null;

  const [credentialPCD, setCredentialPCD] = useState<PCD | undefined>(
    undefined
  );

  const pcds = usePCDCollection();

  useEffect(() => {
    let pcdPackage: PCDPackage;
    async function deserialize() {
      setCredentialPCD(await pcdPackage.deserialize(credential.pcd));
    }

    if (credential && alreadySubscribed) {
      pcdPackage = pcds.getPackage(credential.type);
      deserialize();
    }
  }, [credential, alreadySubscribed, pcds, setCredentialPCD]);

  const dispatch = useDispatch();

  const openResolveErrorModal = useCallback(() => {
    dispatch({
      type: "resolve-subscription-error",
      subscriptionId: subscription.id
    });
  }, [dispatch, subscription]);

  const credentialDisplayOptions = credentialPCD
    ? pcds.getPackage(credential.type).getDisplayOptions(credentialPCD)
    : null;

  return (
    <InfoRowContainer>
      <FeedName>{info.name}</FeedName>
      <Spacer h={8} />
      <Description>{info.description}</Description>
      {alreadySubscribed && credentialDisplayOptions && (
        <>
          <Spacer h={8} />
          <div>
            Authenticated using{" "}
            <strong>{credentialDisplayOptions.header}</strong>
          </div>
        </>
      )}
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
        <AlreadySubscribed
          subscriptions={subscriptions}
          existingSubscription={existingSubscriptions[0]}
        />
      ) : (
        <SubscribeSection
          subscriptions={subscriptions}
          providerUrl={providerUrl}
          providerName={providerName}
          info={info}
        />
      )}
    </InfoRowContainer>
  );
}

function SubscribeSection({
  subscriptions,
  providerUrl,
  providerName,
  info
}: {
  subscriptions: FeedSubscriptionManager;
  providerUrl: string;
  providerName: string;
  info: Feed;
}) {
  const identity = useIdentity();
  const pcds = usePCDCollection();
  const [subscribing, setSubscribing] = useState<boolean>(false);

  // Only two types of credential can be requested
  // If none is specified, default to SemaphoreSignaturePCD
  const requiredCredentialType =
    info.credentialType === EmailPCDPackage.name
      ? EmailPCDPackage.name
      : SemaphoreSignaturePCDPackage.name;

  // If feed asked for email PCD, make sure we have one
  const missingCredential =
    requiredCredentialType === EmailPCDPackage.name &&
    pcds.getPCDsByType(requiredCredentialType).length === 0;

  const onSubscribeClick = useCallback(() => {
    (async () => {
      if (!subscriptions.getProvider(providerUrl)) {
        subscriptions.addProvider(providerUrl, providerName);
      }

      // If we have a credential type specified, and it's not a
      // SemaphoreSignaturePCD, then look it up from PCDCollection.
      // We can't do this with SemaphoreSignaturePCD because it's generated
      // dynamically rather than stored in the collection.
      if (info.credentialType === EmailPCDPackage.name) {
        const matchingPcds = pcds.getPCDsByType(info.credentialType);
        if (matchingPcds.length > 0) {
          setSubscribing(true);
          subscriptions.subscribe(
            providerUrl,
            info,
            await pcds.serialize(matchingPcds[0])
          );
        } else {
          // We shouldn't get here as the UI should not allow us to attempt
          // this
          console.log("No credential PCD found");
        }
      } else {
        setSubscribing(true);
        const credential = await SemaphoreSignaturePCDPackage.serialize(
          await SemaphoreSignaturePCDPackage.prove({
            identity: {
              argumentType: ArgumentTypeName.PCD,
              value: await SemaphoreIdentityPCDPackage.serialize(
                await SemaphoreIdentityPCDPackage.prove({
                  identity: identity
                })
              )
            },
            signedMessage: {
              argumentType: ArgumentTypeName.String,
              value: ISSUANCE_STRING
            }
          })
        );

        subscriptions.subscribe(providerUrl, info, credential);
      }
    })();
  }, [subscriptions, identity, providerUrl, providerName, info, pcds]);

  const credentialHumanReadableName =
    requiredCredentialType === EmailPCDTypeName
      ? "Verified Email"
      : "Semaphore Signature";

  return (
    <>
      {missingCredential && (
        <div>
          This feed requires a {credentialHumanReadableName} PCD, which you do
          not have.
        </div>
      )}
      {!missingCredential && (
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
        disabled={missingCredential || subscribing}
        onClick={onSubscribeClick}
        size="small"
      >
        <Spinner show={subscribing} text="Subscribe" />
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
  } else {
    return (
      <PermissionListItem>
        Unknown permission {permission.type}
      </PermissionListItem>
    );
  }
}

function AlreadySubscribed({
  subscriptions,
  existingSubscription
}: {
  existingSubscription: Subscription;
  subscriptions: FeedSubscriptionManager;
}) {
  const onUnsubscribeClick = useCallback(() => {
    if (
      window.confirm(
        `Are you sure you want to unsubscribe from ${existingSubscription.feed.name}?`
      )
    ) {
      subscriptions.unsubscribe(existingSubscription.id);
    }
  }, [existingSubscription.id, existingSubscription.feed.name, subscriptions]);

  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  };

  return (
    <div>
      <div>This feed has the following permissions:</div>
      <PermissionsView permissions={existingSubscription.feed.permissions} />
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
