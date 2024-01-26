import { useZupassPopupMessages } from "@pcd/passport-interface";
import { EdDSATicketFieldsToReveal } from "@pcd/zk-eddsa-event-ticket-pcd";
import { useEffect } from "react";
import {
  authenticate,
  generateNonce,
  logout,
  openZKEdDSAEventTicketPopup
} from "./utils";

/**
 * Interface specifying the properties for configuring the EdDSA ticket PCD authentication
 * button making proofs on top of the ZK EdDSA Event Ticket PCD.
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
   */
  ticketFieldsToReveal?: EdDSATicketFieldsToReveal;

  /**
   * An array of unique Universal Unique Identifiers (UUIDs) for the events.
   *
   * You may optionally select which events are supported for your
   * authentication process by specifying the events UUIDs within this array.
   */
  validEventIds?: Array<string>;

  /**
   * An array of unique Universal Unique Identifiers (UUIDs) for the products.
   *
   * You may optionally select which products are supported for your
   * authentication process by specifying the products UUIDs within this array.
   */
  validProductIds?: string[];

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
 * This React component provides a customizable button for both authentication
 * facilitating EdDSA ticket PCDs for specific sets of events and products.
 *
 * A user can authenticate anonymously by selecting a specific subset of ticket
 * fields to reveal during the authentication process.
 */
export default function ZuAuthButton({
  ticketFieldsToReveal,
  validEventIds,
  validProductIds,
  authenticated,
  setAuthenticated
}: ZuAuthButtonProps): JSX.Element {
  const [pcdStr] = useZupassPopupMessages();

  useEffect(() => {
    (async function requestAuthentication(): Promise<void> {
      if (pcdStr) {
        const authenticated = await authenticate(pcdStr);

        setAuthenticated(authenticated);
      }
    })();
  }, [pcdStr, setAuthenticated]);

  return (
    <button
      onClick={
        !authenticated
          ? async (): Promise<void> => {
              openZKEdDSAEventTicketPopup(
                ticketFieldsToReveal,
                BigInt(await generateNonce()),
                validEventIds,
                validProductIds
              );
            }
          : async (): Promise<void> => {
              await logout();

              setAuthenticated(false);
            }
      }
    >
      {authenticated ? "Logout" : "Login"}
    </button>
  );
}
