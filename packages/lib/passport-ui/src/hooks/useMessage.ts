import { Message, MessagePCD, getMessage } from "@pcd/message-pcd";
import { useMemo } from "react";

export function useMessage(pcd: MessagePCD): Message | undefined {
  return useMemo(() => {
    return getMessage(pcd);
  }, [pcd]);
}
