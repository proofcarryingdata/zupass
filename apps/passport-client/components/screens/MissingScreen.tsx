import { useContext, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { DispatchContext } from "../../src/dispatch";

export function MissingScreen() {
  const [_, dispatch] = useContext(DispatchContext);
  const loc = useLocation();
  const message = `Missing ${loc.pathname}`;
  useEffect(() => {
    dispatch({ type: "error", error: { title: "Page not found", message } });
  }, []);
  return null;
}
