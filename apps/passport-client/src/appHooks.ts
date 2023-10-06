import { wrap, Wrapper } from "@pcd/emitter";
import { FeedSubscriptionManager, User } from "@pcd/passport-interface";
import { PCDCollection } from "@pcd/pcd-collection";
import { PCD } from "@pcd/pcd-types";
import { Identity } from "@semaphore-protocol/identity";
import { useContext, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Dispatcher, StateContext } from "./dispatch";
import { AppError, AppState } from "./state";
import { useSelector } from "./subscribe";
import { hasSetupPassword } from "./user";

export function usePCDCollectionWithHash(): {
  pcds: PCDCollection;
  hash: string | undefined;
} {
  const pcds = useSelector<PCDCollection>((s) => s.pcds, []);
  const [hash, setHash] = useState<string | undefined>();

  useEffect(() => {
    return pcds.hashEmitter.listen((newHash: string) => {
      setHash(newHash);
    });
  }, [pcds]);

  return {
    pcds,
    hash
  };
}

export function usePCDs(): PCD[] {
  const { pcds } = usePCDCollectionWithHash();
  return [...pcds.getAll()];
}

export function usePCDsInFolder(folder: string): PCD[] {
  const { pcds } = usePCDCollectionWithHash();
  return [...pcds.getAllPCDsInFolder(folder)];
}

export function useFolders(path: string) {
  const { pcds } = usePCDCollectionWithHash();
  return pcds.getFoldersInFolder(path);
}

export function usePCDCollection(): PCDCollection {
  const { pcds } = usePCDCollectionWithHash();
  return pcds;
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

export function useModal(): AppState["modal"] {
  return useSelector<AppState["modal"]>((s) => s.modal, []);
}

export function useSyncKey(): string | undefined {
  return useSelector<string | undefined>((s) => s.encryptionKey, []);
}

export function useSalt(): string | undefined {
  return useSelector<string | undefined>((s) => s.self?.salt, []);
}

export function useAppError(): AppError | undefined {
  return useSelector<AppError | undefined>((s) => s.error, []);
}

export function useLoadedIssuedPCDs(): boolean | undefined {
  return useSelector<boolean | undefined>((s) => s.loadedIssuedPCDs, []);
}

export function useIsDownloaded(): boolean | undefined {
  return useSelector<boolean | undefined>((s) => s.downloadedPCDs, []);
}

export function useIsSyncSettled(): boolean {
  const isDownloaded = useIsDownloaded();
  const loadedIssued = useLoadedIssuedPCDs();

  return isDownloaded && loadedIssued;
}

export function useIsLoggedIn(): boolean {
  return useSelector<boolean | undefined>((s) => s.self !== undefined, []);
}

export function useUploadedId(): string | undefined {
  return useSelector<string | undefined>((s) => s.uploadedUploadId, []);
}

export function useResolvingSubscriptionId(): string | undefined {
  return useSelector<string | undefined>((s) => s.resolvingSubscriptionId);
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
export function useHasSetupPassword() {
  const self = useSelf();
  return hasSetupPassword(self);
}

// Hook that when invoked, requires the user to set a password if they haven't already
export function useRequirePassword() {
  const hasSetupPassword = useHasSetupPassword();
  const dispatch = useDispatch();
  if (!hasSetupPassword) {
    dispatch({
      type: "set-modal",
      modal: {
        modalType: "require-add-password"
      }
    });
  }
}
