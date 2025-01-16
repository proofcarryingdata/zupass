import {
  EdDSATicketPCD,
  EdDSATicketPCDPackage,
  EdDSATicketPCDTypeName
} from "@pcd/eddsa-ticket-pcd";
import {
  NetworkFeedApi,
  PODBOX_CREDENTIAL_REQUEST
} from "@pcd/passport-interface";
import { ReplaceInFolderAction } from "@pcd/pcd-collection";
import {
  PODTicketPCD,
  PODTicketPCDPackage,
  PODTicketPCDTypeName
} from "@pcd/pod-ticket-pcd";
import {
  QueryClient,
  QueryClientProvider,
  useQuery
} from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import styled from "styled-components";
import * as v from "valibot";
import { BottomModal } from "../../new-components/shared/BottomModal";
import { Button2 } from "../../new-components/shared/Button";
import { NewModals } from "../../new-components/shared/Modals/NewModals";
import { NewLoader } from "../../new-components/shared/NewLoader";
import { Typography } from "../../new-components/shared/Typography";
import { appConfig } from "../../src/appConfig";
import {
  useCredentialManager,
  useDispatch,
  useLoginIfNoSelf,
  useSelf
} from "../../src/appHooks";
import { pendingRequestKeys } from "../../src/sessionStorage";
import { Spacer } from "../core";
import { PCDCard } from "../shared/PCDCard";

const ClaimRequestSchema = v.object({
  feedUrl: v.pipe(v.string(), v.url()),
  type: v.literal("ticket")
});

export type ClaimRequest = v.InferOutput<typeof ClaimRequestSchema>;

function validateRequest(
  params: URLSearchParams
): v.SafeParseResult<typeof ClaimRequestSchema> {
  return v.safeParse(ClaimRequestSchema, Object.fromEntries(params.entries()));
}

/**
 * ClaimScreen is the main screen for claiming a ticket. It validates the request
 * and then displays the claim screen.
 */
export function ClaimScreen(): JSX.Element | null {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const request = validateRequest(params);
  const queryClient = new QueryClient();

  useLoginIfNoSelf(
    pendingRequestKeys.claimTicket,
    request.success ? request.output : undefined
  );

  return (
    <div>
      {request.success &&
      // Only allow feeds from the Zupass server/Podbox for now.
      request.output.feedUrl.startsWith(appConfig.zupassServer) ? (
        <QueryClientProvider client={queryClient}>
          <ClaimScreenInner feedUrl={request.output.feedUrl} />
        </QueryClientProvider>
      ) : (
        <BottomModal
          modalContainerStyle={{ padding: 24 }}
          isOpen={true}
          dismissable={false}
        >
          <div>Invalid claim link.</div>
        </BottomModal>
      )}
    </div>
  );
}

/**
 * ClaimScreenInner is the main screen for claiming a ticket.
 *
 * This appears at /#/claim?type=ticket&url=<feed url>
 *
 * The feed URL should be the URL of a feed on Podbox, as given in the Podbox
 * UI. On load, the feed will be polled, and a ticket extracted from the
 * actions returned.
 *
 * A button is shown to allow the user to claim the ticket.
 *
 * This will only show the first ticket available from the feed. It is not
 * designed to handle multiple tickets from the same feed.
 */
export function ClaimScreenInner({
  feedUrl
}: {
  feedUrl: string;
}): JSX.Element | null {
  const credentialManager = useCredentialManager();
  const dispatch = useDispatch();
  const self = useSelf();
  const initialEmails = useRef(self?.emails);

  // Poll the feed to get the actions for the current user.
  // This happens on load, and will send a feed credential to the server.
  // As the feed credential contains email addresses, we earlier restrict the
  // use of this mechanism to Zupass server/Podbox feeds.
  // In the future, we will allow other feeds to be used, but we may want to
  // give the user a way to verify that the feed is trusted before making the
  // request.
  const feedActionsQuery = useQuery({
    queryKey: ["feedActions"],
    queryFn: async () => {
      return new NetworkFeedApi().pollFeed(feedUrl, {
        feedId: feedUrl.split("/").pop() as string,
        // Pass in the user's credential to poll the feed.
        pcd: await credentialManager.requestCredential(
          PODBOX_CREDENTIAL_REQUEST
        )
      });
    }
  });

  const [ticket, setTicket] = useState<PODTicketPCD | null>(null);
  const [eddsaTicket, setEddsaTicket] = useState<
    EdDSATicketPCD | undefined | null
  >(null);
  const [folder, setFolder] = useState<string | null>(null);
  const [ticketNotFound, setTicketNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    // If we have feed actions, we can extract the folder name and the ticket.
    if (feedActionsQuery.data) {
      if (feedActionsQuery.data.success) {
        // Filter out the actions that are not ReplaceInFolder actions.
        const actions = feedActionsQuery.data.value.actions.filter(
          (action): action is ReplaceInFolderAction =>
            action.type === "ReplaceInFolder_action"
        );
        if (actions.length > 0) {
          // Extract the folder name from the first action.
          const folderName = actions[0].folder;
          setFolder(folderName);

          // Extract PCDs from the actions.
          const pcds = actions.flatMap((action) => action.pcds);

          // Filter out the PODTicketPCDs.
          const podTicketPcds = pcds.filter(
            (pcd) => pcd.type === PODTicketPCDTypeName
          );

          if (podTicketPcds.length > 0) {
            // Deserialize the first PODTicketPCD.
            PODTicketPCDPackage.deserialize(podTicketPcds[0].pcd)
              .then((pcd) => {
                setTicket(pcd);

                // Find the EdDSATicketPCD that matches the PODTicketPCD, if
                // one exists.
                Promise.all(
                  pcds
                    .filter((pcd) => pcd.type === EdDSATicketPCDTypeName)
                    .map((pcd) => EdDSATicketPCDPackage.deserialize(pcd.pcd))
                ).then((tickets) => {
                  // Will set to 'undefined' if no matching EdDSATicketPCD is
                  // found.
                  setEddsaTicket(
                    tickets.find(
                      (ticket) =>
                        ticket.claim.ticket.ticketId ===
                        pcd.claim.ticket.ticketId
                    )
                  );
                });
              })
              .catch(() => {
                // If this happens then either the PODTicketPCD or
                // EdDSATicketPCD failed to deserialize. This is highly
                // unlikely to happen, but if it does then we should show an
                // error. Reaching this point would indicate that the feed
                // contains invalid PCDs, which might be a temporary issue on
                // the server side.
                setError("Ticket feed contains invalid data.");
              });
          } else {
            setTicketNotFound(true);
          }
        }
      }
    }
  }, [feedActionsQuery.data]);

  const loading = feedActionsQuery.isLoading;

  let content = null;

  if (complete) {
    content = (
      <div>
        <Typography fontSize={18} fontWeight={800} color="#8B94AC">
          CLAIMED
        </Typography>
        <Spacer h={24} />
        <a href="/">
          <Button2>Go to Zupass</Button2>
        </a>
      </div>
    );
  } else if (loading) {
    content = (
      <LoaderContainer>
        <NewLoader columns={5} rows={5} />
        <Typography fontSize={18} fontWeight={800} color="#8B94AC">
          LOADING
        </Typography>
      </LoaderContainer>
    );
  } else if (feedActionsQuery.error || feedActionsQuery.data?.error || error) {
    content = (
      <ClaimError>
        <p>Unable to load ticket. Please try again later.</p>
        <ErrorText>
          Error:{" "}
          {feedActionsQuery.error?.message ??
            feedActionsQuery.data?.error ??
            error}
        </ErrorText>
      </ClaimError>
    );
  } else if (ticketNotFound) {
    content = (
      <ClaimError>
        <p>
          No ticket found for your email address. Check with the event organizer
          to ensure that your email is included.
        </p>
        <p>
          Your email addresses are:
          <EmailList>
            {self?.emails.map((email) => (
              <EmailListItem key={email}>{email}</EmailListItem>
            ))}
          </EmailList>
          <Spacer h={16} />
          <Button2
            onClick={() => {
              dispatch({
                type: "set-bottom-modal",
                modal: { modalType: "help-modal" }
              });
            }}
          >
            Manage my Emails
          </Button2>
          {!self?.emails.every(
            (email) => initialEmails.current?.includes(email)
          ) && (
            <>
              <Spacer h={16} />
              <Button2
                onClick={() => {
                  window.location.reload();
                }}
              >
                Reload and try again
              </Button2>
            </>
          )}
          <NewModals />
        </p>
      </ClaimError>
    );
  } else if (ticket && folder) {
    content = (
      <div>
        <div>
          <Typography family="Barlow" fontWeight={800} fontSize={20}>
            ADD{" "}
            <span style={{ color: "var(--core-accent)" }}>
              {ticket.claim.ticket.eventName.toLocaleUpperCase()}
            </span>{" "}
            TO YOUR ZUPASS
          </Typography>
        </div>
        <CardWrapper>
          <PCDCard
            pcd={ticket}
            expanded={true}
            hidePadding={true}
            hideRemoveButton={true}
          />
        </CardWrapper>
        <Button2
          onClick={async () => {
            await dispatch({
              type: "add-pcds",
              pcds: [
                // There may not be an EdDSATicketPCD; if so, add only the POD
                // ticket.
                ...(eddsaTicket
                  ? [await EdDSATicketPCDPackage.serialize(eddsaTicket)]
                  : []),
                await PODTicketPCDPackage.serialize(ticket)
              ],
              folder: folder,
              upsert: false
            });
            setComplete(true);
          }}
        >
          Claim
        </Button2>
      </div>
    );
  }

  return (
    // This isn't really a modal, but this is what we do for the other screens
    // in the new UX.
    // At some point this should be given a more sensible name or be
    // refactored.
    <BottomModal
      modalContainerStyle={{ padding: 24 }}
      isOpen={true}
      dismissable={false}
    >
      {content}
    </BottomModal>
  );
}

const CardWrapper = styled.div`
  margin: 16px 0px;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
`;

const LoaderContainer = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
`;

const ClaimError = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ErrorText = styled.p`
  font-size: 14px;
`;

const EmailList = styled.ul`
  margin: 8px 0px;
`;

const EmailListItem = styled.li`
  font-size: 14px;
  list-style-type: square;
  margin-left: 16px;
`;
