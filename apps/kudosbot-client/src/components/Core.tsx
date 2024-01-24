import { useCallback, useState } from "react";
import styled from "styled-components";

export const CollapsableCode = ({
  code,
  label
}: {
  code: string;
  label?: string;
}): JSX.Element => {
  const [collapsed, setCollapsed] = useState(true);

  const toggle = useCallback(() => {
    setCollapsed((collapsed) => !collapsed);
  }, []);

  let buttonText = collapsed ? "Expand" : "Collapse";
  if (label !== undefined) {
    buttonText += " " + label;
  }

  if (collapsed) {
    return <button onClick={toggle}>{buttonText}</button>;
  }

  return (
    <>
      <button onClick={toggle}>{buttonText}</button>
      <CollapsableCodeContainer>
        <pre>{code}</pre>
      </CollapsableCodeContainer>
    </>
  );
};

const CollapsableCodeContainer = styled.div`
  border-radius: 8px;
  border: 1px solid grey;
  overflow-y: scroll;
  max-width: 100%;
  padding: 8px;
`;
