import { coercions, PODPipelineInputFieldType } from "@pcd/passport-interface";
import * as React from "react";
import {
  CellBase,
  DataEditorComponent,
  DataViewerComponent
} from "react-spreadsheet";

type Cell = CellBase<Date | string | undefined>;

export const DateViewer: DataViewerComponent<Cell> = ({ cell }) => {
  const value = cell?.value || "";
  const parsed = coercions[PODPipelineInputFieldType.Date](value);

  return (
    <div
      className={`Spreadsheet__data-viewer ${
        parsed.success ? "" : "Spreadsheet__data-viewer--invalid"
      }`}
      style={{ pointerEvents: "none" }}
    >
      {value instanceof Date ? value.toISOString() : value}
    </div>
  );
};

export const DateEditor: DataEditorComponent<Cell> = ({ cell, onChange }) => {
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
  const parsed = coercions[PODPipelineInputFieldType.Date](value);

  return (
    <div className="Spreadsheet__data-editor">
      <input
        autoFocus
        type="datetime-local"
        onChange={handleChange}
        value={parsed.success ? parsed.data.toISOString() : value.toString()}
        style={{
          backgroundColor: parsed.success ? "inherit" : "rgb(90, 27, 35, 1)"
        }}
      />
    </div>
  );
};
