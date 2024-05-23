import { ETHBERLIN04 } from "./configs/ethberlin";
import { authenticate } from "./server";
import {
  ZuAuthArgs,
  zuAuthPopup,
  zuAuthRedirect,
  zupassPopupSetup
} from "./zuauth";

export {
  ETHBERLIN04,
  authenticate,
  zuAuthPopup,
  zuAuthRedirect,
  zupassPopupSetup
};
export type { ZuAuthArgs };
