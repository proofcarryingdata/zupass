import { User } from "@pcd/passport-interface";
import { PCDCollection } from "@pcd/pcd-collection";
import { PCD } from "@pcd/pcd-types";
import { Identity } from "@semaphore-protocol/identity";
import { useContext } from "react";
import { Dispatcher, StateContext } from "./dispatch";
import { AppState } from "./state";
import { useSelector } from "./subscribe";

export function usePCDs(): PCD[] {
  return useSelector<PCD[]>((s) => s.pcds.getAll(), []);
}

export function usePCDCollection(): PCDCollection {
  return useSelector<PCDCollection>((s) => s.pcds, []);
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
