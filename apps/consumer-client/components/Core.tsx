import Link from "next/link";
import React, { useCallback, useState } from "react";
import styled from "styled-components";
import { PCD_GITHUB_URL } from "../src/constants";

export const Container = styled.div`
  font-family: system-ui, sans-serif;
  border: 1px solid black;
  border-radius: 8px;
  padding: 8px;
  margin-bottom: 8px;
`;

export const HomeLink = () => {
  return <Link href={"/"}>Home</Link>;
};

export const CodeLink = ({
  file,
  children,
}: {
  file: string;
  children: React.ReactNode;
}) => {
  return <Link href={PCD_GITHUB_URL + file}>{children}</Link>;
};

export const CollapsableCode = ({
  code,
  label,
}: {
  code: string;
  label?: string;
}) => {
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
  background-color: #eee;
  border-radius: 8px;
  border: 1px solid grey;
  overflow-y: scroll;
  max-width: 100%;
  padding: 8px;
`;
