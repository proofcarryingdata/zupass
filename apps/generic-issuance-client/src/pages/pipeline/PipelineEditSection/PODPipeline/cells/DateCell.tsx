import * as React from "react";
import {
  CellBase,
  DataEditorComponent,
  DataViewerComponent
} from "react-spreadsheet";

type Cell = CellBase<Date | undefined>;

export const DateViewer: DataViewerComponent<Cell> = ({ cell }) => (
  <div className="Spreadsheet__data-viewer" style={{ pointerEvents: "none" }}>
    {cell?.value?.toString()}
  </div>
);

export const DateEditor: DataEditorComponent<Cell> = ({ cell, onChange }) => {
  const handleChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onChange({
        ...cell,
        value: new Date(event.target.value)
      });
    },
    [cell, onChange]
  );

  const value = cell?.value;
  return (
    <div className="Spreadsheet__data-editor">
      <input
        autoFocus
        type="datetime-local"
        onChange={handleChange}
        value={value?.toISOString()}
      />
    </div>
  );
};
