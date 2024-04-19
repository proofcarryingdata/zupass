import { GenericIssuanceSelfResponseValue } from "@pcd/passport-interface";
import { useGIContext } from "./Context";

/**
 * Returns true if the currently logged-in user provided
 * is an admin and has turned on the local admin-mode view.
 */
export function useIsAdminView(
  user?: GenericIssuanceSelfResponseValue
): boolean {
  const ctx = useGIContext();
  const isAdminView = !!(ctx.isAdminMode && user?.isAdmin);
  return isAdminView;
}
