import { usePassportPopupSetup } from "@pcd/passport-interface";

/**
 * This page is necessary to receive PCDs from the passport after requesting
 * a PCD from the passport. It uses the window messaging API to communicate
 * the PCD it received back to the requesting tab.
 */
export default function PassportPopupRedirect() {
  const error = usePassportPopupSetup();
  return <div>{error}</div>;
}
