import { ECD_2024_END, ECD_2024_START } from "./sharedConstants";

export function isDuringEdgeCityDenver(): boolean {
  const currentTimeMs = new Date().getTime();
  return currentTimeMs >= ECD_2024_START && currentTimeMs < ECD_2024_END;
}
