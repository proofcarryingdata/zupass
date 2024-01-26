import { Spacer } from "@pcd/passport-ui";
import { useEffect, useState } from "react";
import { CenterColumn, TextCenter } from "../core";
import { RippleLoader } from "../core/RippleLoader";

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
    <CenterColumn>
      <TextCenter>
        <Spacer h={128} />
        <RippleLoader />
        <Spacer h={24} />
        {textVisible && text && <>{text}</>}
      </TextCenter>
    </CenterColumn>
  );
}
