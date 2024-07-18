import * as React from "react";
import {
  CellBase,
  DataEditorComponent,
  DataViewerComponent
} from "react-spreadsheet";

type Cell = CellBase<boolean | undefined>;

export const BooleanViewer: DataViewerComponent<Cell> = ({ cell }) => (
  <div className="Spreadsheet__data-viewer">
    {cell?.value ? "true" : "false"}
  </div>
);

export const BooleanEditor: DataEditorComponent<Cell> = ({
  cell,
  onChange
}) => {
  const handleChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onChange({
        ...cell,
        value: event.target.checked
      });
    },
    [cell, onChange]
  );

  const value = cell?.value || false;
  return (
    <div className="Spreadsheet__data-editor">
      <input
        autoFocus
        type="checkbox"
        onChange={handleChange}
        checked={value}
      />
    </div>
  );
};
