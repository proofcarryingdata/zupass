import { Spacer } from "@pcd/passport-ui";
import { ReactNode, useState } from "react";

interface ExpandableTextProps {
  shortText: string | ReactNode;
  longText: string | ReactNode;
}

export default function ExpandableText({
  shortText,
  longText
}: ExpandableTextProps): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  return (
    <div>
      {expanded ? longText : shortText}
      <Spacer h={4} />
      <a onClick={() => setExpanded((prev) => !prev)}>
        {expanded ? "Show less" : "Learn more"}
      </a>
    </div>
  );
}
