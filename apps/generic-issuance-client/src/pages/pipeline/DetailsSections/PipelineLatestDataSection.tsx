import { ReactNode } from "react";
import { FancyEditor } from "../../../components/FancyEditor";

/**
 * Used to display the latest data that a given pipeline loaded during
 * the last time that it was run.
 */
export function PipelineLatestDataSection({
  latestAtoms
}: {
  latestAtoms?: unknown[];
}): ReactNode {
  if (!latestAtoms) {
    return null;
  }

  return (
    <FancyEditor
      dark
      style={{ width: "100%", height: "300px" }}
      readonly={true}
      value={latestAtoms.map((log) => JSON.stringify(log)).join("\n")}
    />
  );
}
