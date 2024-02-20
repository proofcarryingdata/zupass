import { ReactNode } from "react";
import { CSVPCDPreview } from "./CSVPCDPreview";
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
    case PreviewType.PCD:
      return <CSVPCDPreview csv={csv} />;
    default:
      return null as never;
  }
}

export enum PreviewType {
  CSVSheet = "CSVSheet",
  PCD = "PCD"
}
