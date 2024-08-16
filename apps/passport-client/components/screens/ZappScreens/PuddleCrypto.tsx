import { ReactNode } from "react";
import { ZappScreen } from "./ZappScreen";

export const PUDDLE_CRYPTO_FOLDER_NAME = "P U D D L E C R Y P T O";

export function isPuddleCryptoFolderName(folder: string): boolean {
  return folder === PUDDLE_CRYPTO_FOLDER_NAME;
}

export function PuddleCryptoScreen(): ReactNode {
  return <ZappScreen />;
}
