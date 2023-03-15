import { ArgsOf } from "@pcd/passport-interface";
import {
  Argument,
  BigIntArgument,
  isBigIntArgument,
  isBooleanArgument,
  isNumberArgument,
  isObjectArgument,
  isPCDArgument,
  isStringArgument,
  PCDPackage,
  StringArgument,
} from "@pcd/pcd-types";
import React, { useCallback } from "react";
import styled from "styled-components";

export function PCDArgs<T extends PCDPackage>({
  args,
  setArgs,
}: {
  args: ArgsOf<T>;
  setArgs: (args: ArgsOf<T>) => void;
}) {
  const entries = Object.entries(args);

  return (
    <div>
      {entries.map(([key, value], i) => (
        <PCDArgInput
          key={i}
          argName={key}
          arg={value}
          args={args}
          setArgs={setArgs}
        />
      ))}
    </div>
  );
}

export function PCDArgInput<T extends PCDPackage>({
  arg,
  argName,
  args,
  setArgs,
}: {
  arg: Argument<any, any>;
  argName: string;
  args: ArgsOf<T>;
  setArgs: (args: ArgsOf<T>) => void;
}) {
  if (isStringArgument(arg)) {
    return (
      <StringArgInput
        args={args}
        arg={arg}
        argName={argName}
        setArgs={setArgs}
      />
    );
  } else if (isNumberArgument(arg)) {
    return <ArgContainer>number arg {argName}</ArgContainer>;
  } else if (isBigIntArgument(arg)) {
    return (
      <BigIntArgInput
        args={args}
        arg={arg}
        argName={argName}
        setArgs={setArgs}
      />
    );
  } else if (isBooleanArgument(arg)) {
    return <ArgContainer>boolean arg {argName}</ArgContainer>;
  } else if (isObjectArgument(arg)) {
    return <ArgContainer>object arg {argName}</ArgContainer>;
  } else if (isPCDArgument(arg)) {
    return <ArgContainer>pcd arg {argName}</ArgContainer>;
  }
}

export function StringArgInput<T extends PCDPackage>({
  arg,
  argName,
  args,
  setArgs,
}: {
  arg: StringArgument;
  argName: string;
  args: ArgsOf<T>;
  setArgs: (args: ArgsOf<T>) => void;
}) {
  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      console.log("changing", e.target.value);
      args[argName].value = e.target.value;
      setArgs(JSON.parse(JSON.stringify(args)));
    },
    [args, setArgs]
  );

  return (
    <ArgContainer>
      {argName}:
      <input
        value={arg.value}
        onChange={onChange}
        disabled={!arg.userProvided}
      />
    </ArgContainer>
  );
}

export function BigIntArgInput<T extends PCDPackage>({
  arg,
  argName,
  args,
  setArgs,
}: {
  arg: BigIntArgument;
  argName: string;
  args: ArgsOf<T>;
  setArgs: (args: ArgsOf<T>) => void;
}) {
  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      console.log("changing", e.target.value);
      args[argName].value = e.target.value;
      setArgs(JSON.parse(JSON.stringify(args)));
    },
    [args, setArgs]
  );

  return (
    <ArgContainer>
      {argName}:
      <input
        value={arg.value}
        onChange={onChange}
        disabled={!arg.userProvided}
      />
    </ArgContainer>
  );
}

const ArgContainer = styled.div`
  padding: 4px;
  border: 1px solid black;
`;
