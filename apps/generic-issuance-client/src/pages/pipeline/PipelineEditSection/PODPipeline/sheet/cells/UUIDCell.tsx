import { PODPipelineInputFieldType } from "@pcd/passport-interface";
import { coercions } from "@pcd/podbox-shared";
import * as React from "react";
import {
  CellBase,
  DataEditorComponent,
  DataViewerComponent
} from "react-spreadsheet";

type Cell = CellBase<string | undefined>;

export const UUIDViewer: DataViewerComponent<Cell> = ({ cell }) => {
  const value = cell?.value || "";
  const parsed = coercions[PODPipelineInputFieldType.UUID](value);

  return (
    <div
      className={`Spreadsheet__data-viewer ${
        parsed.success ? "" : "Spreadsheet__data-viewer--invalid"
      }`}
      style={{ pointerEvents: "none" }}
    >
      {value}
    </div>
  );
};

export const UUIDEditor: DataEditorComponent<Cell> = ({ cell, onChange }) => {
  const handleChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      onChange({
        ...cell,
        value
      });
    },
    [cell, onChange]
  );

  const value = cell?.value || "";
  const parsed = coercions[PODPipelineInputFieldType.UUID](value);

  return (
    <div className="Spreadsheet__data-editor">
      <input
        autoFocus
        type="text"
        onChange={handleChange}
        value={value.toString()}
        style={{
          backgroundColor: parsed.success ? "inherit" : "rgb(90, 27, 35, 1)"
        }}
      />
    </div>
  );
};
