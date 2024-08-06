import React from "react";

export const PCDScreen = React.memo(PCDScreenImpl);

export function PCDScreenImpl(): JSX.Element | null {
  return <div>pcd screen</div>;
}
