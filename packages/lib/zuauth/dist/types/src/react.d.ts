import { PopupActionResult } from "@pcd/passport-interface/PassportPopup/core";
import { ZuAuthArgs } from "./index";
type ZuAuthReactResult = PopupActionResult | {
    type: "loading";
};
/**
 * Simple React effect hook for using ZuAuth for authentication.
 */
export declare function useZuAuthPopup(args: ZuAuthArgs): ZuAuthReactResult;
export {};
//# sourceMappingURL=react.d.ts.map