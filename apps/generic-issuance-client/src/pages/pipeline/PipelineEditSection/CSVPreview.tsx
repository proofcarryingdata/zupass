import { ReactNode } from "react";
import { CSVSheetPreview } from "./CSVSheetPreview";

export function CSVPreview({
  csv,
  previewType
}: {
  csv: string;
  previewType?: PreviewType;
}): ReactNode {
  if (!previewType) {
    return null;
  }

  switch (previewType) {
    case PreviewType.CSVSheet:
      return <CSVSheetPreview csv={csv} />;
    default:
      return null as never;
  }
}

export enum PreviewType {
  CSVSheet = "CSVSheet"
}
