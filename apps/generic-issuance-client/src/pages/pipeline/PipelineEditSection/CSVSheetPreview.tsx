import { ReactNode } from "react";

export function CSVSheetPreview({ csv }: { csv: string }): ReactNode {
  return (
    <div>
      csv sheet preview of <br /> <pre>{csv}</pre>
    </div>
  );
}
