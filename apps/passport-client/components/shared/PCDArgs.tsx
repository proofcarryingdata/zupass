import { ArgsOf } from "@pcd/passport-interface";
import { PCDCollection } from "@pcd/pcd-collection";
import {
  Argument,
  BigIntArgument,
  BooleanArgument,
  isBigIntArgument,
  isBooleanArgument,
  isNumberArgument,
  isObjectArgument,
  isPCDArgument,
  isStringArgument,
  NumberArgument,
  PCDArgument,
  PCDPackage,
  StringArgument,
} from "@pcd/pcd-types";
import React, { useCallback } from "react";
import styled from "styled-components";

export function PCDArgs<T extends PCDPackage>({
  args,
  setArgs,
  pcdCollection,
}: {
  args: ArgsOf<T>;
  setArgs: (args: ArgsOf<T>) => void;
  pcdCollection: PCDCollection;
}) {
  const entries = Object.entries(args);

  return (
    <div>
      {entries.map(([key, value], i) => (
        <ArgInput
          pcdCollection={pcdCollection}
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

export function ArgInput<T extends PCDPackage>({
  arg,
  argName,
  args,
  setArgs,
  pcdCollection,
}: {
  arg: Argument<any, any>;
  argName: string;
  args: ArgsOf<T>;
  setArgs: (args: ArgsOf<T>) => void;
  pcdCollection: PCDCollection;
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
    return (
      <NumberArgInput
        args={args}
        arg={arg}
        argName={argName}
        setArgs={setArgs}
      />
    );
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
    return (
      <BooleanArgInput
        args={args}
        arg={arg}
        argName={argName}
        setArgs={setArgs}
      />
    );
  } else if (isObjectArgument(arg)) {
    return (
      <ObjectArgInput
        args={args}
        arg={arg}
        argName={argName}
        setArgs={setArgs}
      />
    );
  } else if (isPCDArgument(arg)) {
    return (
      <PCDArgInput
        args={args}
        arg={arg}
        argName={argName}
        setArgs={setArgs}
        pcdCollection={pcdCollection}
      />
    );
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

export function NumberArgInput<T extends PCDPackage>({
  arg,
  argName,
  args,
  setArgs,
}: {
  arg: NumberArgument;
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

export function BooleanArgInput<T extends PCDPackage>({
  arg,
  argName,
  args,
  setArgs,
}: {
  arg: BooleanArgument;
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

export function ObjectArgInput<T extends PCDPackage>({
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

export function PCDArgInput<T extends PCDPackage>({
  arg,
  argName,
  args,
  setArgs,
  pcdCollection,
}: {
  arg: PCDArgument;
  argName: string;
  args: ArgsOf<T>;
  setArgs: (args: ArgsOf<T>) => void;
  pcdCollection: PCDCollection;
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
      <select>
        <option value={"none"}>select</option>
        {pcdCollection.getAll().map((pcd) => {
          return <option value={pcd.id}>{pcd.type}</option>;
        })}{" "}
      </select>
    </ArgContainer>
  );
}

const ArgContainer = styled.div`
  padding: 4px;
  border: 1px solid black;
`;
