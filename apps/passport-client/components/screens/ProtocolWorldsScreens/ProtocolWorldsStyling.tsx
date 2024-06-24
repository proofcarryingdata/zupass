import { useEffect } from "react";

export function ProtocolWorldsStyling(): JSX.Element {
  useEffect(() => {
    const rootStyle = document.documentElement.style;
    rootStyle.setProperty("--bg-dark-primary", "rgb(141,141,141)");
    rootStyle.setProperty("--bg-dark-gray", "rgb(109,109,109)");
    rootStyle.setProperty("--bg-lite-primary", "gray");
    rootStyle.setProperty("--bg-lite-gray", "rgb(88, 88, 88)");
    rootStyle.setProperty("--primary-dark", "rgb(174,174,174)");
    rootStyle.setProperty("--primary-lite", "white");
    rootStyle.setProperty("--accent-dark", "white");
    rootStyle.setProperty("--accent-darker", "rgb(222,222,222)");
    rootStyle.setProperty("--accent-lite", "white");
    // rootStyle.setProperty("--accent-lite", "white");
    return () => {
      rootStyle.removeProperty("--bg-dark-primary");
      rootStyle.removeProperty("--bg-dark-gray");
      rootStyle.removeProperty("--bg-lite-primary");
      rootStyle.removeProperty("--bg-lite-gray");
      rootStyle.removeProperty("--primary-dark");
      rootStyle.removeProperty("--primary-lite");
      rootStyle.removeProperty("--accent-dark");
      rootStyle.removeProperty("--accent-darker");
      rootStyle.removeProperty("--accent-lite");
    };
  }, []);
  return <></>;
}
