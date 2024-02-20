import { ReactNode } from "react";

export function CSVPCDPreview({ csv }: { csv: string }): ReactNode {
  return (
    <div>
      pcd preview of csv <br /> <pre>{csv}</pre>
    </div>
  );
}
