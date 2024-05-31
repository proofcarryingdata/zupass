import { useEffect } from "react";

export function OneClickLoginScreen(): JSX.Element | null {
  useEffect(() => {
    window.location.hash = "#/";
  }, []);
  return null;
}
