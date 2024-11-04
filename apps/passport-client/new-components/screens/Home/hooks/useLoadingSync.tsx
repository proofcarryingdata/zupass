import { useEffect } from "react";
import { useIsSyncSettled, useSelf } from "../../../../src/appHooks";
import { toast } from "react-hot-toast";
import { DocumentCheckIcon } from "@heroicons/react/16/solid";

const SYNC_LOADING_TOAST_ID = "syncing-toast-id";
export const useLoadingSync = (): void => {
  const isSyncSettled = useIsSyncSettled();
  const self = useSelf();
  useEffect(() => {
    if (!self) return;
    if (!isSyncSettled) {
      toast.loading("Syncing...", { id: SYNC_LOADING_TOAST_ID });
    } else {
      toast.dismiss(SYNC_LOADING_TOAST_ID);
      toast.success("Done.", {
        icon: <DocumentCheckIcon width={20} height={20} color="#ccc092" />
      });
    }
  }, [isSyncSettled, self]);
};
