import { EdDSATicketPCDPackage } from "@pcd/eddsa-ticket-pcd";
import {
  openSemaphoreSignaturePopup,
  useZupassPopupMessages
} from "@pcd/passport-interface";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import {
  EdDSATicketFieldsToReveal,
  ZKEdDSAEventTicketPCDPackage
} from "@pcd/zk-eddsa-event-ticket-pcd";
import { useEffect } from "react";
import { ZUPASS_URL } from "../../../constants";
import {
  authenticate,
  generateNonce,
  getProofWithoutProving,
  logout,
  openZKEdDSAEventTicketPopup
} from "./utils";

/**
 * Interface specifying the properties for configuring the EdDSA ticket PCD authentication
 * (either ZK or with a Semaphore Signature PCD) button.
 *
 * If both `validEventIds` and `validProductIds` lists are provided, they must be of the same length
 * and will be validated in pairs. Empty arrays can be provided to bypass this validation, 
 * thereby considering all event and product identifiers as valid.
 */
export interface ZuAuthButtonProps {
  /**
   * Specifies the list of fields of the ticket that should be disclosed in a proof.
   *
   * A ticket represents the purchase of a product, which is associated with one specific event.
   *
   * This property should be provided exclusively for anonymous authentication.
   */
  ticketFieldsToReveal?: EdDSATicketFieldsToReveal;

  /**
   * An array of unique Universal Unique Identifiers (UUIDs) for the events.
   *
   * You may optionally select which events are supported for your
   * authentication process by specifying the events UUIDs within this array.
   *
   * This property should be provided exclusively for anonymous authentication.
   */
  validEventIds?: Array<string>;

  /**
   * An array of unique Universal Unique Identifiers (UUIDs) for the products.
   *
   * You may optionally select which products are supported for your
   * authentication process by specifying the products UUIDs within this array.
   *
   * This property should be provided exclusively for anonymous authentication.
   */
  validProductIds?: string[];

  /**
   * This property must be true when working with a ZK EdDSA event ticket PCD.
   */
  useAnonAuthentication: boolean;

  /**
   * A boolean to trace the authentication status of the user within the current session.
   */
  authenticated: boolean;

  /**
   * A handler to alter the authentication status of the user within the current session.
   */
  setAuthenticated: (status: boolean) => void;
}

/**
 * This React component provides a customizable button for both anonymous and 
 * non-anonymous authentication, facilitating EdDSA ticket PCDs for specific sets 
 * of events and products.
 * 
 * In anonymous mode, a selected subset of ticket fields is revealed during the 
 * authentication process.
 */
export default function ZuAuthButton({
  ticketFieldsToReveal,
  validEventIds,
  validProductIds,
  useAnonAuthentication,
  authenticated,
  setAuthenticated
}: ZuAuthButtonProps) {
  const [pcdStr] = useZupassPopupMessages();

  useEffect(() => {
    (async function requestAuthentication() {
      if (pcdStr) {
        const { pcd, type } = JSON.parse(pcdStr);

        if (
          type === ZKEdDSAEventTicketPCDPackage.name ||
          type === SemaphoreSignaturePCDPackage.name
        ) {
          const isAuthenticated = await authenticate(pcdStr);

          setAuthenticated(isAuthenticated);
        }

        if (type === EdDSATicketPCDPackage.name) {
          // This occurs consistently after a successful EdDSA ticket selection 
          // in a non-anonymous authentication flow.
          openSemaphoreSignaturePopup(
            ZUPASS_URL,
            window.location.origin + "#/popup",
            // pcd + nonce (challenge) + timestamp.
            `${pcd}+${await generateNonce()}+${Date.now()}`,
            false
          );
        }
      }
    })();
  }, [pcdStr, setAuthenticated]);

  return (
    <button
      onClick={
        !authenticated
          ? async () => {
              if (useAnonAuthentication) {
                openZKEdDSAEventTicketPopup(
                  ticketFieldsToReveal,
                  BigInt(await generateNonce()),
                  validEventIds,
                  validProductIds
                );
              } else {
                getProofWithoutProving();
              }
            }
          : async () => {
              await logout();

              setAuthenticated(false);
            }
      }
    >
      {authenticated
        ? "Logout"
        : "Login"}
    </button>
  );
}
