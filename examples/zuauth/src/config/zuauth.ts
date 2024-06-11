import { ZuAuthArgs } from "@pcd/zuauth";
import { ESMERALDA_TICKET } from "@pcd/zuauth/configs/esmeralda";

/**
 * ZuAuth configuration.
 * Can be found in Podbox in the "ZuAuth Configuration" section of your
 * pipeline dashboard.
 */
export const config: ZuAuthArgs["config"] = ESMERALDA_TICKET;
