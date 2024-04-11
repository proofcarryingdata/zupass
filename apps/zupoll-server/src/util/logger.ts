import * as log4js from "log4js";

export const logger = log4js.getLogger();
logger.level = process.env.MIN_LOG_LEVEL ?? "debug";

export const LOGO = `
                       _ _ 
                      | | |
_______  _ ____   ___ | | |
|_  / | | | '_ \\ / _ \\| | |
 / /| |_| | |_) | (_) | | |
/___|\\__,_| .__/ \\___/|_|_|
          | |              
          |_|                 
`;
