import { wrap, Wrapper } from "@pcd/emitter";
import { SubscriptionManager, User } from "@pcd/passport-interface";
import { PCDCollection } from "@pcd/pcd-collection";
import { PCD } from "@pcd/pcd-types";
import { Identity } from "@semaphore-protocol/identity";
import { useContext, useEffect, useState } from "react";
import { Dispatcher, StateContext } from "./dispatch";
import { AppError, AppState, PendingAction } from "./state";
import { useSelector } from "./subscribe";

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

export function usePendingAction(): PendingAction | undefined {
  return useSelector<PendingAction | undefined>((s) => s.pendingAction, []);
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

export function useIsLoggedIn(): boolean {
  return useSelector<boolean | undefined>((s) => s.self !== undefined, []);
}

export function useUploadedId(): string | undefined {
  return useSelector<string | undefined>((s) => s.uploadedUploadId, []);
}

export function useSubscriptions(): Wrapper<SubscriptionManager> {
  const subs = useSelector<SubscriptionManager>((s) => s.subscriptions, []);
  const [wrappedSubs, setWrappedSubs] =
    useState<Wrapper<SubscriptionManager>>();

  useEffect(() => {
    return subs.updatedEmitter.listen(() => {
      setWrappedSubs(wrap(subs));
    });
  }, [subs]);

  return wrappedSubs;
}
