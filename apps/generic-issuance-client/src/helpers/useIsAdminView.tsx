import { ZuboxSelfResponseValue } from "@pcd/passport-interface";
import { useContext } from "react";
import { GIContext } from "./Context";

/**
 * Returns true if the currently logged-in user provided
 * is an admin and has turned on the local admin-mode view.
 */
export function useIsAdminView(user?: ZuboxSelfResponseValue): boolean {
  const ctx = useContext(GIContext);
  const isAdminView = !!(ctx.isAdminMode && user?.isAdmin);
  return isAdminView;
}
