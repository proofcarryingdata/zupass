import { ReactNode } from "react";
import { CSVSheetPreview } from "./CSVSheetPreview";

export function CSVPreview({
  csv,
  previewType,
  onChange
}: {
  csv: string;
  previewType?: PreviewType;
  onChange?: (newCsv: string) => void;
}): ReactNode {
  if (!previewType) {
    return null;
  }

  switch (previewType) {
    case PreviewType.CSVSheet:
      return <CSVSheetPreview csv={csv} onChange={onChange} />;
    default:
      return null as never;
  }
}

export enum PreviewType {
  CSVSheet = "CSVSheet"
}
