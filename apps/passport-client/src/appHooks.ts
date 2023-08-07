import { User } from "@pcd/passport-interface";
import { PCD } from "@pcd/pcd-types";
import { useSelector } from "./subscribe";

export function usePCDs(): PCD[] {
  return useSelector<PCD[]>((s) => s.pcds.getAll(), []);
}

export function useSelf(): User | undefined {
  return useSelector<User | undefined>((s) => s.self, []);
}
