import { useEffect } from "react";
import { useIsSyncSettled } from "../../../../src/appHooks";
import { toast } from "react-hot-toast";

const SYNC_LOADING_TOAST_ID = "syncing-toast-id";
export const useLoadingSync = (): void => {
  const isSyncSettled = useIsSyncSettled();
  useEffect(() => {
    if (!isSyncSettled) {
      toast.loading("syncing", { id: SYNC_LOADING_TOAST_ID });
    } else {
      toast.dismiss(SYNC_LOADING_TOAST_ID);
    }
  }, [isSyncSettled]);
};
