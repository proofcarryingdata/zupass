import { EmailPCDTypeName } from "@pcd/email-pcd";
import { Emitter } from "@pcd/emitter";
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
import { sleep } from "@pcd/util";
import _ from "lodash";
import React, {
  MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { FaCheck } from "react-icons/fa";
import { MdError } from "react-icons/md";
import Markdown from "react-markdown";
import { useNavigate } from "react-router-dom";
import styled, { FlattenSimpleInterpolation, css } from "styled-components";
import { appConfig } from "../../src/appConfig";
import {
  useCredentialCache,
  useDispatch,
  useIdentityV3,
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
  pendingRequestKeys,
  setPendingAddSubscriptionRequest
} from "../../src/sessionStorage";
import { useSyncE2EEStorage } from "../../src/useSyncE2EEStorage";
import { BigInput, Button, Spacer } from "../core";
import { MaybeModal } from "../modals/Modal";
import { AppContainer } from "../shared/AppContainer";
import { ScreenNavigation } from "../shared/ScreenNavigation";
import { Spinner } from "../shared/Spinner";
import { FolderCard, FolderExplorerContainer } from "./HomeScreen/Folder";

const DEFAULT_FEEDS_URL = appConfig.zupassServer + "/feeds";

enum FeedFetchStates {
  Idle,
  Fetching,
  Fetched
}

type FeedFetch =
  | {
      state: FeedFetchStates.Idle;
    }
  | {
      state: FeedFetchStates.Fetching;
    }
  | {
      state: FeedFetchStates.Fetched;
      success: true;
      feeds: Feed[];
      providerUrl: string;
      providerName: string;
    }
  | {
      state: FeedFetchStates.Fetched;
      success: false;
      error: string;
    };

export function AddSubscriptionScreen(): JSX.Element | null {
  useSyncE2EEStorage();
  const query = useQuery();
  const url = query?.get("url") ?? "";
  const isDeepLink = url.length > 0;
  // When mailing out subscription links, senders can include a "suggested"
  // email. If the user is not logged in, they will be prompted to sign up
  // using that email. If the user is logged in, they will be warned that the
  // feed may not give them the PCDs they expect.
  const suggestedEmail = query?.get("email");
  const [providerUrl, setProviderUrl] = useState(
    url.length > 0 ? url : DEFAULT_FEEDS_URL
  );
  const [feedFetch, setFeedFetch] = useState<FeedFetch>({
    state: FeedFetchStates.Idle
  });

  const { value: subs } = useSubscriptions();
  const self = useSelf();
  const dispatch = useDispatch();
  const userForcedToLogout = useUserForcedToLogout();
  const [mismatchedEmails, setMismatchedEmails] = useState<boolean>(false);

  useEffect(() => {
    if (!self || userForcedToLogout) {
      clearAllPendingRequests();
      const stringifiedRequest = JSON.stringify(url);
      setPendingAddSubscriptionRequest(stringifiedRequest);
      const emailParameter = suggestedEmail
        ? `&email=${encodeURIComponent(suggestedEmail)}`
        : "";
      window.location.href = `/#/login?redirectedFromAction=true&${
        pendingRequestKeys.addSubscription
      }=${encodeURIComponent(stringifiedRequest)}${emailParameter}`;
    } else {
      if (
        suggestedEmail &&
        !self.emails
          .map((e) => e.trim().toLocaleLowerCase())
          .includes(suggestedEmail?.trim().toLocaleLowerCase())
      ) {
        // User is logged in, but they probably got this subscription link from an email for a different address
        setMismatchedEmails(true);
      }
    }
  }, [self, dispatch, url, userForcedToLogout, suggestedEmail]);

  const onFetchFeedsClick = useCallback(() => {
    if (feedFetch.state === FeedFetchStates.Fetching) {
      return;
    }

    setFeedFetch({ state: FeedFetchStates.Fetching });

    subs
      .listFeeds(providerUrl)
      .then((response) => {
        setFeedFetch({
          state: FeedFetchStates.Fetched,
          success: true,
          feeds: response.feeds,
          providerName: response.providerName,
          providerUrl: response.providerUrl
        });
        if (!subs.getProvider(response.providerUrl)) {
          subs.addProvider(response.providerUrl, response.providerName);
          saveSubscriptions(subs);
        }
      })
      .catch((e) => {
        console.log(`error fetching subscription infos ${e}`);
        setFeedFetch({
          state: FeedFetchStates.Fetched,
          success: false,
          error:
            "Unable to fetch subscriptions. Check that the URL is correct, or try again later."
        });
      });
  }, [providerUrl, subs, feedFetch.state]);

  useEffect(() => {
    const url = query?.get("url") ?? "";
    // If a URL was specified in the query string, automatically fetch feeds for it
    if (url.length > 0 && feedFetch.state !== FeedFetchStates.Fetched) {
      onFetchFeedsClick();
    }
  }, [onFetchFeedsClick, providerUrl, query, subs, feedFetch.state]);

  const alreadyFetched =
    feedFetch.state === FeedFetchStates.Fetched &&
    feedFetch.success &&
    feedFetch.providerUrl === providerUrl;

  const isFetching = feedFetch.state === FeedFetchStates.Fetching;

  const fetchError =
    feedFetch.state === FeedFetchStates.Fetched && !feedFetch.success;

  // If self is null, the earlier useEffect hook will take us to the login page
  if (!self) {
    return null;
  }

  return (
    <>
      <MaybeModal />
      <AppContainer bg="primary">
        <ScreenNavigation label={"Subscriptions"} to="/subscriptions" />
        <SubscriptionsScreenContainer>
          {mismatchedEmails && (
            <MismatchedEmailWarning>
              <p>
                Your
                {self.emails.length === 1 ? (
                  <>
                    email is: <strong>{self.emails[0]}</strong>
                  </>
                ) : (
                  <>
                    emails are:{" "}
                    {self.emails.map((e, i) => (
                      <React.Fragment key={e}>
                        <strong>{e}</strong>
                        {i !== self.emails.length - 1 && ", "}
                      </React.Fragment>
                    ))}
                  </>
                )}{" "}
                but the subscription link was sent to{" "}
                <strong>{suggestedEmail}</strong>, which doesn't belong to this
                account.
              </p>
              <p>
                This may mean that you cannot receive your expected PCDs. If you
                own <strong>{suggestedEmail}</strong> you can add it to your
                Zupass account in Zupass settings.
              </p>
            </MismatchedEmailWarning>
          )}
          {
            // If this screen was not-deep linked to, or if it *was*
            // deep-linked to and an error was encountered, show the URL and
            // button to request the feeds.
            (!isDeepLink || fetchError) && (
              <>
                <Spacer h={8} />
                <BigInput
                  autoCorrect="off"
                  autoCapitalize="off"
                  disabled={isFetching}
                  value={providerUrl}
                  onChange={(e): void => {
                    setProviderUrl(e.target.value);
                  }}
                />
                <Spacer h={8} />
                <Button
                  disabled={isFetching || alreadyFetched}
                  onClick={onFetchFeedsClick}
                >
                  <Spinner show={isFetching} text="List Feeds" />
                </Button>
              </>
            )
          }
          {fetchError && <SubscriptionErrors>{fetchError}</SubscriptionErrors>}
          {feedFetch.state === FeedFetchStates.Fetched &&
            feedFetch.success &&
            feedFetch.feeds.map((info, i) => (
              <React.Fragment key={i}>
                <Spacer h={8} />
                <SubscriptionInfoRow
                  subscriptions={subs}
                  providerUrl={feedFetch.providerUrl}
                  providerName={feedFetch.providerName}
                  info={info}
                  key={i}
                  showErrors={false}
                  isDeepLink={isDeepLink}
                  isExpanded={true}
                />
              </React.Fragment>
            ))}
        </SubscriptionsScreenContainer>
      </AppContainer>
    </>
  );
}

export function SubscriptionInfoRow({
  subscriptions,
  providerUrl,
  providerName,
  info,
  showErrors,
  isDeepLink,
  isExpanded,
  onClose
}: {
  subscriptions: FeedSubscriptionManager;
  providerUrl: string;
  providerName: string;
  info: Feed;
  showErrors: boolean;
  isDeepLink: boolean;
  isExpanded?: boolean;
  onClose?: Emitter<unknown>;
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

  const [moreInfo, setMoreInfo] = useState(isExpanded);
  const ref = useRef<HTMLDivElement>();

  useEffect(() => {
    return onClose?.listen(() => {
      setMoreInfo(false);
    });
  }, [onClose, isExpanded]);

  return (
    <InfoRowContainer
      ref={(element): void => {
        ref.current = element ?? undefined;
      }}
      expanded={moreInfo ?? isExpanded ?? false}
      lockExpanded={isExpanded ?? false}
      onClick={async (e: MouseEvent): Promise<void> => {
        const targetTag = (e.target as HTMLElement).tagName.toLowerCase();
        if (["a", "button"].includes(targetTag)) {
          return;
        }

        const nowOpen = !moreInfo;

        if (nowOpen) {
          onClose?.emit({});
          await sleep(0);
          ref.current?.scrollIntoView({
            behavior: "instant"
          });
          window.scrollBy(0, -50);
          setMoreInfo(true);
        } else {
          onClose?.emit({});
        }
      }}
    >
      <FeedNameRow>
        {error ? (
          <>
            <MdError color="var(--danger-bright)" size={18} />
          </>
        ) : (
          <>
            <FaCheck size={18} />
          </>
        )}
        {info.name}
      </FeedNameRow>
      <Spacer h={8} />
      {moreInfo && (
        <>
          <Markdown>{info.description}</Markdown>
          <Spacer h={8} />
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
          {!isDeepLink && alreadySubscribed && showErrors && error && (
            <>
              <Spacer h={8} />
              <SubscriptionErrors>
                <Button onClick={openResolveErrorModal}>Resolve Errors</Button>
              </SubscriptionErrors>
              <Spacer h={8} />
            </>
          )}
        </>
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
}): JSX.Element {
  const identity = useIdentityV3();
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
    ((): void => {
      dispatch({
        type: "add-subscription",
        providerUrl,
        providerName,
        feed: info
      });
    })();
  }, [providerUrl, info, dispatch, providerName]);

  const credentialHumanReadableName =
    info.credentialRequest.pcdType === undefined
      ? "Signature"
      : info.credentialRequest.pcdType === EmailPCDTypeName
      ? "Verified Email"
      : "";

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
      <Button disabled={missingCredentialPCD} onClick={onSubscribeClick}>
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
  const onUnsubscribeClick = useCallback(async () => {
    if (
      window.confirm(
        `Are you sure you want to unsubscribe from ${existingSubscription.feed.name}?`
      )
    ) {
      let deleteContents = false;

      if (
        window.confirm(
          "would you also like to delete all PCDs" +
            " in the folder controlled by this feed?"
        )
      ) {
        deleteContents = true;
      }

      await dispatch({
        type: "remove-subscription",
        subscriptionId: existingSubscription.id,
        deleteContents
      });

      window.scrollTo(0, 0);
    }
  }, [existingSubscription.feed.name, existingSubscription.id, dispatch]);

  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  };

  const navigate = useNavigate();
  const folders = _.uniq(
    existingSubscription.feed.permissions.map((p) => p.folder)
  ).sort((a, b) => a.localeCompare(b));
  const goToFolder = useCallback(
    (folder: string) => {
      navigate(`/?folder=${encodeURIComponent(folder)}`);
    },
    [navigate]
  );

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
      <Spacer h={8} />

      <>
        You subscribed to this feed on{" "}
        {new Date(existingSubscription.subscribedTimestamp).toLocaleDateString(
          navigator.language,
          options
        )}
      </>

      <Spacer h={24} />

      <>This feed can write to the following folders:</>

      <Spacer h={8} />

      <FolderExplorerContainer style={{ margin: 0 }}>
        {folders.map((folder) => (
          <FolderCard
            key={folder}
            onFolderClick={(): void => {
              goToFolder(folder);
            }}
            folder={folder}
          />
        ))}
      </FolderExplorerContainer>

      {isDefaultSubscription(existingSubscription) ? (
        <></>
      ) : (
        <>
          <Spacer h={16} />
          <Button onClick={onUnsubscribeClick} style="danger">
            Remove
          </Button>
        </>
      )}
    </div>
  );
}

const InfoRowContainer = styled.div`
  ${({
    expanded,
    lockExpanded
  }: {
    expanded: boolean;
    lockExpanded: boolean;
  }): FlattenSimpleInterpolation => css`
    transition:
      background-color 100ms,
      border 100ms;

    background-color: rgba(255, 255, 255, 0.05);

    user-select: none;

    ${expanded
      ? css`
          border: 1px solid #ddd;
          padding: 16px;
          border-radius: 16px;
          cursor: pointer;
        `
      : css`
          cursor: pointer;
          user-select: none;
          border: 1px solid grey;
          padding: 16px;
          border-radius: 16px;
        `}

    ${lockExpanded
      ? css`
          cursor: initial;
        `
      : css`
          &:hover {
            border: 1px solid white;
            background-color: rgba(255, 255, 255, 0.07);

            &:active {
              background-color: rgba(255, 255, 255, 0.1);
            }
          }
        `}
  `}
`;

const SubscriptionsScreenContainer = styled.div`
  padding-bottom: 128px;
  width: 100%;
`;

const FeedNameRow = styled.div`
  font-weight: bold;
  font-size: 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 100%;

  div:nth-child(2) {
    flex-shrink: 1;
    flex-grow: 1;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  div:nth-child(3) {
    flex-shrink: 0;
  }
`;

const SubscriptionErrors = styled.div``;

const PermissionListItem = styled.li`
  margin-left: 14px;
  list-style-type: circle;
`;

const MismatchedEmailWarning = styled.div`
  p {
    margin-bottom: 16px;
  }
`;
