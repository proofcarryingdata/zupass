import { ArgsOf } from "@pcd/passport-interface";
import {
  Argument,
  isBigIntArgument,
  isBooleanArgument,
  isNumberArgument,
  isObjectArgument,
  isPCDArgument,
  isStringArgument,
  PCDPackage,
} from "@pcd/pcd-types";
import React from "react";
import styled from "styled-components";

export function PCDArgs<T extends PCDPackage>({ args }: { args: ArgsOf<T> }) {
  const entries = Object.entries(args);

  return (
    <div>
      {entries.map(([key, value], i) => (
        <PCDArgInput key={i} argName={key} arg={value} />
      ))}
    </div>
  );
}

export function PCDArgInput({
  arg,
  argName,
}: {
  arg: Argument<any, any>;
  argName: string;
}) {
  if (isStringArgument(arg)) {
    return <ArgContainer>string arg {argName}</ArgContainer>;
  } else if (isNumberArgument(arg)) {
    return <ArgContainer>number arg {argName}</ArgContainer>;
  } else if (isBigIntArgument(arg)) {
    return <ArgContainer>bigInt arg {argName}</ArgContainer>;
  } else if (isBooleanArgument(arg)) {
    return <ArgContainer>boolean arg {argName}</ArgContainer>;
  } else if (isObjectArgument(arg)) {
    return <ArgContainer>object arg {argName}</ArgContainer>;
  } else if (isPCDArgument(arg)) {
    return <ArgContainer>pcd arg {argName}</ArgContainer>;
  }
}

const ArgContainer = styled.div`
  padding: 4px;
  border: 1px solid black;
`;
