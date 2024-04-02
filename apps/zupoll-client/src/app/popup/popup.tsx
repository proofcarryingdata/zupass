"use client";

import { useZupassPopupSetup } from "@pcd/passport-interface";

/**
 * This page is necessary to receive PCDs from the passport after requesting
 * a PCD from the passport. It uses the window messaging API to communicate
 * the PCD it received back to the requesting tab.
 */
export function PopupPage() {
  const error = useZupassPopupSetup();
  return <div>{error}</div>;
}
