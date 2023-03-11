import * as React from "react";
import { useLocation } from "react-router-dom";

export function SaveSelfScreen() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const participant = JSON.parse(params.get("participant"));
  console.log("Save self", participant);

  // TODO: save self, or show an error page.
  return <div>Save Self Screen</div>;
}
