import { PODPipelineInputFieldType } from "@pcd/passport-interface";
import { coercions } from "@pcd/podbox-shared";
import * as React from "react";
import {
  CellBase,
  DataEditorComponent,
  DataViewerComponent
} from "react-spreadsheet";

type Cell = CellBase<string | undefined>;

export const EdDSAPubKeyViewer: DataViewerComponent<Cell> = ({ cell }) => {
  const value = cell?.value || "";
  const parsed = coercions[PODPipelineInputFieldType.EdDSAPubKey](value);
  console.log("parsed", parsed);
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

export const EdDSAPubKeyEditor: DataEditorComponent<Cell> = ({
  cell,
  onChange
}) => {
  const handleChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onChange({
        ...cell,
        value: event.target.value.toString()
      });
    },
    [cell, onChange]
  );

  const value = cell?.value || "";
  const parsed = coercions[PODPipelineInputFieldType.EdDSAPubKey](value);
  console.log("parsed", parsed);

  return (
    <div className="Spreadsheet__data-editor">
      <input
        autoFocus
        type="text"
        onChange={handleChange}
        value={value}
        style={{
          color: "green",
          backgroundColor: parsed.success ? "inherit" : "rgb(90, 27, 35, 1)"
        }}
      />
    </div>
  );
};
