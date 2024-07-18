import * as React from "react";
import {
  CellBase,
  DataEditorComponent,
  DataViewerComponent
} from "react-spreadsheet";

type Cell = CellBase<bigint | undefined>;

export const IntegerViewer: DataViewerComponent<Cell> = ({ cell }) => (
  <div
    className="Spreadsheet__data-viewer"
    style={{ pointerEvents: "none", textAlign: "right" }}
  >
    {cell?.value?.toString()}
  </div>
);

export const IntegerEditor: DataEditorComponent<Cell> = ({
  cell,
  onChange
}) => {
  const handleChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onChange({
        ...cell,
        value: BigInt(event.target.value)
      });
    },
    [cell, onChange]
  );

  const value = cell?.value || 0;
  return (
    <div className="Spreadsheet__data-editor">
      <input
        autoFocus
        type="number"
        onChange={handleChange}
        value={value.toString()}
        style={{ textAlign: "right" }}
      />
    </div>
  );
};
