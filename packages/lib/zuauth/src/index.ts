import { ESMERALDA_TICKET } from "./configs/esmeralda";
import { ETHBERLIN04 } from "./configs/ethberlin";
import { ETHPRAGUE_TICKET } from "./configs/ethprague";
import { authenticate } from "./server";
import {
  ZuAuthArgs,
  zuAuthPopup,
  zuAuthRedirect,
  zupassPopupSetup
} from "./zuauth";

export {
  ESMERALDA_TICKET,
  ETHBERLIN04,
  ETHPRAGUE_TICKET,
  authenticate,
  zuAuthPopup,
  zuAuthRedirect,
  zupassPopupSetup
};
export type { ZuAuthArgs };
