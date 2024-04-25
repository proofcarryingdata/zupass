import { make0xPARChq } from "./configs/2024_0xparc_hq";
import { makeEsmeralda } from "./configs/2024_edge_esmeralda";
import { makeEthBerlin } from "./configs/2024_eth_berlin";
import { makeEthPrague } from "./configs/2024_eth_prague";
import { LoginConfig } from "./types";

export function getPodboxConfigs(
  ZUPASS_CLIENT_URL: string,
  ZUPASS_SERVER_URL: string
): LoginConfig[] {
  const PARC_HQ_CONFIG = make0xPARChq(ZUPASS_CLIENT_URL, ZUPASS_SERVER_URL);
  const ESMERALDA_CONFIG = makeEsmeralda(ZUPASS_CLIENT_URL, ZUPASS_SERVER_URL);
  const ETH_PRAGUE_CONFIG = makeEthPrague(ZUPASS_CLIENT_URL, ZUPASS_SERVER_URL);
  const ETH_BERLIN_CONFIG = makeEthBerlin(ZUPASS_CLIENT_URL, ZUPASS_SERVER_URL);

  return [
    ...PARC_HQ_CONFIG,
    ...ESMERALDA_CONFIG,
    ...ETH_PRAGUE_CONFIG,
    ...ETH_BERLIN_CONFIG
  ];
}
