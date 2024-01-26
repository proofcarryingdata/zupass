import { useZupassPopupSetup } from "@pcd/passport-interface";

/**
 * This popup sends requests to, and receives PCDs from Zupass.
 */
export default function ZupassPopupRedirect(): JSX.Element {
  const error = useZupassPopupSetup();
  return <div>{error}</div>;
}
