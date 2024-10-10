import { useEffect, useState } from "react";
import { NewLoader } from "../../new-components/shared/NewLoader";
import { Typography } from "../../new-components/shared/Typography";

const textDisplayTimeout = 2000;

export function ScreenLoader({ text }: { text?: string }): JSX.Element {
  const [textVisible, setTextVisible] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setTextVisible(true);
    }, textDisplayTimeout);
    return () => {
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh"
      }}
    >
      <NewLoader />
      <Typography style={{ marginTop: 10 }}>
        {textVisible && text && <>{text}</>}
      </Typography>
    </div>
  );
}
