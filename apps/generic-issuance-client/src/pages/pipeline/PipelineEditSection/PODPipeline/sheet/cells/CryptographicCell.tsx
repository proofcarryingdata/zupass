import { PODPipelineInputFieldType } from "@pcd/passport-interface";
import { coercions } from "@pcd/podbox-shared";
import * as React from "react";
import {
  CellBase,
  DataEditorComponent,
  DataViewerComponent
} from "react-spreadsheet";

type Cell = CellBase<bigint | string | undefined>;

export const CryptographicViewer: DataViewerComponent<Cell> = ({ cell }) => {
  const value = cell?.value || "";
  const parsed = coercions[PODPipelineInputFieldType.Cryptographic](value);

  return (
    <div
      className={`Spreadsheet__data-viewer ${
        parsed.success ? "" : "Spreadsheet__data-viewer--invalid"
      }`}
      style={{ pointerEvents: "none", textAlign: "right" }}
    >
      {value.toString()}
    </div>
  );
};

export const CryptographicEditor: DataEditorComponent<Cell> = ({
  cell,
  onChange
}) => {
  const handleChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onChange({
        ...cell,
        value: event.target.value
      });
    },
    [cell, onChange]
  );

  const value = cell?.value || "";
  const parsed = coercions[PODPipelineInputFieldType.Cryptographic](value);

  return (
    <div className="Spreadsheet__data-editor">
      <input
        autoFocus
        type="number"
        onChange={handleChange}
        value={value.toString()}
        style={{
          textAlign: "right",
          backgroundColor: parsed.success ? "inherit" : "rgb(90, 27, 35, 1)"
        }}
      />
    </div>
  );
};
