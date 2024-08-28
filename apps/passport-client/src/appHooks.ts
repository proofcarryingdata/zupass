import { wrap, Wrapper } from "@pcd/emitter";
import {
  CredentialCache,
  CredentialManager,
  FeedSubscriptionManager,
  LATEST_PRIVACY_NOTICE,
  PCDRequest,
  User
} from "@pcd/passport-interface";
import { PCDCollection } from "@pcd/pcd-collection";
import { PCD } from "@pcd/pcd-types";
import { PODTicketPCDTypeName } from "@pcd/pod-ticket-pcd";
import { SemaphoreIdentityPCD } from "@pcd/semaphore-identity-pcd";
import { Identity } from "@semaphore-protocol/identity";
import { useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { appConfig } from "./appConfig";
import {
  Dispatcher,
  StateContext,
  StateContextValue,
  ZuUpdate
} from "./dispatch";
import { loadUsingLaserScanner } from "./localstorage";
import { clearAllPendingRequests } from "./sessionStorage";
import { AppError, AppState } from "./state";
import { useSelector } from "./subscribe";
import { findUserIdentityV3PCD, hasSetupPassword } from "./user";
import { getLastValidVerifyUrl, maybeRedirect } from "./util";

/**
 * Returns the user's PCDCollection, in a wrapper for use in dependencies.
 * The wrapper is guaranteed to change (be replaced with a new object, possibly
 * wrapping the same PCDCollection) each time the contents of PCDCollection
 * changes.  It can be used in dependency lists for React code which needs to
 * recalculate any time the contents of the PCDCollection change, even if the
 * PCDCollection itself is not replaced.
 *
 * This wrapper-based approach may re-render unnecessarily if PCDCollection's
 * change is a nop (such as re-issuing the same tickets), but is much cheaper
 * than analyzing and hashing the full PCDCollection contents.
 */
export function useWrappedPCDCollection(): Wrapper<PCDCollection> {
  const pcds = useSelector<PCDCollection>((s) => s.pcds, []);

  const [wrapper, setWrapper] = useState<Wrapper<PCDCollection>>(wrap(pcds));

  useEffect(() => {
    return pcds.changeEmitter.listen(() => {
      setWrapper(wrap(pcds));
    });
  }, [pcds]);

  return wrapper;
}

export function usePCDCollection(): PCDCollection {
  const wrappedPCDs = useWrappedPCDCollection();
  return wrappedPCDs.value;
}

export function usePCDs(): PCD[] {
  const pcds = usePCDCollection();
  return [...pcds.getAll()];
}

export function usePCDsInFolder(folder: string): PCD[] {
  const pcds = usePCDCollection();
  return [...pcds.getAllPCDsInFolder(folder)];
}

export function useVisiblePCDsInFolder(folder: string): PCD[] {
  const pcds = usePCDsInFolder(folder);
  return pcds.filter(
    (pcd) =>
      // Filter out PODTicketPCDs unless showPODTicketPCDs is true
      pcd.type !== PODTicketPCDTypeName || appConfig.showPODTicketPCDs
  );
}

export function useFolders(path: string): string[] {
  const pcds = usePCDCollection();
  return pcds.getFoldersInFolder(path);
}

export function useUserIdentityPCD(): SemaphoreIdentityPCD | undefined {
  const wrappedPCDs = useWrappedPCDCollection();
  const self = useSelf();
  const identityPCD = useMemo(() => {
    // Using wrapped PCDCollection ensures this memo updates when contents
    // change, not just the PCDCollection object.
    return self && findUserIdentityV3PCD(wrappedPCDs.value, self);
  }, [self, wrappedPCDs]);
  return identityPCD;
}

export function useSelf(): User | undefined {
  return useSelector<User | undefined>((s) => s.self, []);
}

export function useIdentity(): Identity {
  return useSelector<Identity>((s) => s.identity, []);
}

export function useDispatch(): Dispatcher {
  const { dispatch } = useContext(StateContext);
  return dispatch;
}

export function useUpdate(): ZuUpdate {
  const { update } = useContext(StateContext);
  return update;
}

export function useIsOffline(): boolean {
  return useSelector<boolean>((s) => !!s.offline, []);
}

export function useStateContext(): StateContextValue {
  return useContext(StateContext);
}

export function useModal(): AppState["modal"] {
  return useSelector<AppState["modal"]>((s) => s.modal, []);
}

export function useSyncKey(): string | undefined {
  return useSelector<string | undefined>((s) => s.encryptionKey, []);
}

export function useSalt(): string | null | undefined {
  return useSelector<string | null | undefined>((s) => s.self?.salt, []);
}

export function useAppError(): AppError | undefined {
  return useSelector<AppError | undefined>((s) => s.error, []);
}

export function useLoadedIssuedPCDs(): boolean {
  return useSelector<boolean>((s) => !!s.loadedIssuedPCDs, []);
}

export function useIsDownloaded(): boolean {
  return useSelector<boolean>((s) => !!s.downloadedPCDs, []);
}

export function useServerStorageRevision(): string | undefined {
  return useSelector<string | undefined>((s) => s.serverStorageRevision, []);
}

export function useUserForcedToLogout(): boolean {
  const userForcedToLogout = useSelector<boolean>(
    (s) => !!s.userInvalid || !!s.anotherDeviceChangedPassword,
    []
  );

  return userForcedToLogout;
}

export function useUserShouldAgreeNewPrivacyNotice(): void {
  const self = useSelf();
  const dispatch = useDispatch();
  const invalidUser = useUserForcedToLogout();

  if (!invalidUser && self && self.terms_agreed < LATEST_PRIVACY_NOTICE) {
    dispatch({
      type: "prompt-to-agree-privacy-notice"
    });
  }
}

export function useIsSyncSettled(): boolean {
  const isDownloaded = useIsDownloaded();
  const loadedIssued = useLoadedIssuedPCDs();

  return isDownloaded && loadedIssued;
}

export function useIsLoggedIn(): boolean {
  return useSelector<boolean>((s) => s.self !== undefined, []);
}

export function useIsDeletingAccount(): boolean {
  return useSelector<boolean>((s) => !!s.deletingAccount, []);
}

export function useResolvingSubscriptionId(): string | undefined {
  return useSelector<string | undefined>((s) => s.resolvingSubscriptionId);
}

export function useCredentialCache(): CredentialCache {
  return useSelector<CredentialCache>((s) => s.credentialCache);
}

export function useCredentialManager(): CredentialManager {
  const identity = useIdentity();
  const pcds = usePCDCollection();
  const credentialCache = useCredentialCache();
  return useMemo(
    () => new CredentialManager(identity, pcds, credentialCache),
    [credentialCache, identity, pcds]
  );
}

export function useQuery(): URLSearchParams | undefined {
  const location = useLocation();
  try {
    const params = new URLSearchParams(location.search);
    return params;
  } catch (e) {
    console.log("failed to parse query string params", e);
    return undefined;
  }
}

export function useSubscriptions(): Wrapper<FeedSubscriptionManager> {
  const subs = useSelector<FeedSubscriptionManager>((s) => s.subscriptions, []);
  const [wrappedSubs, setWrappedSubs] = useState<
    Wrapper<FeedSubscriptionManager>
  >(() => wrap(subs));

  useEffect(() => {
    return subs.updatedEmitter.listen(() => {
      setWrappedSubs(wrap(subs));
    });
  }, [subs]);

  return wrappedSubs;
}

// Hook that checks whether the user has set a password for their account
export function useHasSetupPassword(): boolean {
  const self = useSelf();
  return !!self && hasSetupPassword(self);
}

// Hook that when invoked, requires the user to set a password if they haven't already
export function useRequirePassword(): void {
  const self = useSelf();
  const hasSetupPassword = useHasSetupPassword();
  const dispatch = useDispatch();
  if (self && !hasSetupPassword) {
    dispatch({
      type: "set-modal",
      modal: {
        modalType: "require-add-password"
      }
    });
  }
}

// Hook that enables keystrokes to properly listen to laser scanning inputs from supported devices
export function useLaserScannerKeystrokeInput(): string {
  const [typedText, setTypedText] = useState("");
  const nav = useNavigate();
  const usingLaserScanner = loadUsingLaserScanner();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (!usingLaserScanner) return;
      if (event.key === "Enter") {
        // Get the verify URL from the keystroke input and navigate to the last match, if it exists
        const url = getLastValidVerifyUrl(typedText);
        if (url) {
          const newLoc = maybeRedirect(url);
          if (newLoc) {
            nav(newLoc);
          }
        }
      }
      // Ignore characters that could not be in a valid URL
      if (/^[a-zA-Z0-9\-._~!$&'()*+,;=:@%#?/]$/.test(event.key)) {
        setTypedText((prevText) => prevText + event.key);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [typedText, nav, usingLaserScanner]);

  return typedText;
}

export function useLoginIfNoSelf(
  key: string,
  request?: PCDRequest | string
): void {
  const self = useSelf();
  const userForcedToLogout = useUserForcedToLogout();

  useEffect(() => {
    if (!self || userForcedToLogout) {
      clearAllPendingRequests();
      const stringifiedRequest = JSON.stringify(request ?? "");

      sessionStorage.setItem(key, stringifiedRequest);
      window.location.href = `/#/login?redirectedFromAction=true&${key}=${encodeURIComponent(
        stringifiedRequest
      )}`;
    }
  }, [key, request, self, userForcedToLogout]);
}

export function useStrichSDKState(): AppState["strichSDKstate"] {
  return useSelector((s) => s.strichSDKstate, []);
}

export function useEmbeddedScreenState(): AppState["embeddedScreen"] {
  return useSelector((s) => s.embeddedScreen, []);
}
