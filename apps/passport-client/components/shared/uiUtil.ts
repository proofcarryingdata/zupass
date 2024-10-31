import { PODValue } from "@pcd/pod";

/**
 * Generates a simple display string for a POD value, without any type
 * information.
 *
 * @param podValue PODValue to display
 * @returns user-readable string
 */
export function displayPODValue(podValue: PODValue): string {
  if (podValue.type === "null") {
    return "null";
  }
  return podValue.value.toString();
}
