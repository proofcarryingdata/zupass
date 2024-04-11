import type { PipelineEventTicketMetadata } from "@pcd/passport-interface";
import { PopupActionResult, zupassPopupSetup } from "@pcd/passport-interface/PassportPopup/core";
import { EdDSATicketFieldsToReveal } from "@pcd/zk-eddsa-event-ticket-pcd/ZKEdDSAEventTicketPCD";
export { zupassPopupSetup };
/**
 * Arguments required for making ZK proofs about tickets.
 */
export interface ZuAuthArgs {
    zupassUrl?: string;
    returnUrl: string;
    fieldsToReveal: EdDSATicketFieldsToReveal;
    watermark: string | bigint;
    eventTicketMetadata: PipelineEventTicketMetadata[];
    externalNullifier?: string | bigint;
    proofTitle?: string;
    proofDescription?: string;
}
/**
 * Opens a popup window to the Zupass prove screen.
 */
export declare function zuAuthPopup(args: ZuAuthArgs): Promise<PopupActionResult>;
/**
 * Navigates to the Zupass prove screen.
 */
export declare function zuAuthRedirect(args: ZuAuthArgs): void;
/**
 * Constructs a URL to the Zupass prove screen for a ZKEdDSAEventTicketPCD
 * zero-knowlege proof.
 */
export declare function constructZkTicketProofUrl(zuAuthArgs: ZuAuthArgs): string;
//# sourceMappingURL=index.d.ts.map