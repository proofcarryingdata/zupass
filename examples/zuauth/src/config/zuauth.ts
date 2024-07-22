import { ZuAuthArgs } from "@pcd/zuauth";
import { ETHPRAGUE_TICKET } from "@pcd/zuauth/configs/ethprague";

/**
 * ZuAuth configuration.
 * Can be found in Podbox in the "ZuAuth Configuration" section of your
 * pipeline dashboard.
 */
export const config: ZuAuthArgs["config"] = ETHPRAGUE_TICKET;
