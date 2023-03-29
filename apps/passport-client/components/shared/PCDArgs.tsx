import { PCDCollection } from "@pcd/pcd-collection";
import {
  ArgsOf,
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
  ObjectArgument,
  PCD,
  PCDArgument,
  PCDPackage,
  StringArgument,
} from "@pcd/pcd-types";
import React, { useCallback, useEffect, useState } from "react";
import styled from "styled-components";

/**
 * Given an {@link Argument}, renders a UI that displays its value.
 * If the user must supply this value, allows the user to input it.
 * If the value is loaded from the internet, loads it. Contains
 * implementations for each type of argument, as outlined by
 * {@link ArgumentTypeName}
 */
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
    <ArgsContainer>
      {entries.map(([key, value], i) => (
        <ArgInput
          pcdCollection={pcdCollection}
          key={i}
          argName={key}
          arg={value as any}
          args={args}
          setArgs={setArgs}
        />
      ))}
    </ArgsContainer>
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
      args[argName].value = e.target.value;
      setArgs(JSON.parse(JSON.stringify(args)));
    },
    [args, setArgs, argName]
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
      args[argName].value = e.target.value;
      setArgs(JSON.parse(JSON.stringify(args)));
    },
    [args, setArgs, argName]
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
      args[argName].value = e.target.value;
      setArgs(JSON.parse(JSON.stringify(args)));
    },
    [args, setArgs, argName]
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
      args[argName].value = e.target.value;
      setArgs(JSON.parse(JSON.stringify(args)));
    },
    [args, setArgs, argName]
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
  arg: ObjectArgument<any>;
  argName: string;
  args: ArgsOf<T>;
  setArgs: (args: ArgsOf<T>) => void;
}) {
  const [_loading, setLoading] = useState(arg.remoteUrl !== undefined);

  // TODO: implement remote loading for all types, not just
  // objects.
  const load = useCallback(async () => {
    const res = await fetch(arg.remoteUrl);
    const remoteObject = JSON.parse(await res.json());
    return remoteObject;
  }, [arg.remoteUrl]);

  useEffect(() => {
    if (arg.remoteUrl) {
      load()
        .then((obj) => {
          setLoading(false);
          args[argName].value = obj;
          setArgs(JSON.parse(JSON.stringify(args)));
        })
        .catch((_e) => {
          setLoading(false);
          // todo: good error handling
        });
    }
  }, [arg.remoteUrl, argName, args, load, setArgs]);

  const onChange = useCallback((_e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // TODO: parse JSON object, validate it
  }, []);

  return (
    <ArgContainer>
      {argName}:
      <textarea
        value={JSON.stringify(arg.value)}
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
  const [value, setValue] = useState<PCD | undefined>(undefined);

  const onChange = useCallback(
    async (e: React.ChangeEvent<HTMLSelectElement>) => {
      const id = e.target.value;
      const pcd = pcdCollection.getById(id);

      if (pcd) {
        const serialized = await pcdCollection.serialize(pcd);
        args[argName].value = serialized;
        setArgs(JSON.parse(JSON.stringify(args)));
      }
    },
    [argName, args, setArgs, pcdCollection]
  );

  useEffect(() => {
    async function deserialize() {
      if (arg.value !== undefined) {
        const parsed = await pcdCollection.deserialize(arg.value);
        setValue(parsed);
      }
    }

    deserialize();
  }, [arg.value, pcdCollection]);

  return (
    <ArgContainer>
      {argName}:
      <select value={value?.id} onChange={onChange}>
        <option key="none" value={"none"}>
          select
        </option>
        {pcdCollection.getAll().map((pcd) => {
          return (
            <option key={pcd.id} value={pcd.id}>
              {pcd.type}
            </option>
          );
        })}
      </select>
    </ArgContainer>
  );
}

const ArgContainer = styled.div`
  padding: 4px;
  border: 1px solid black;
`;

const ArgsContainer = styled.div`
  margin: 16px;
  padding: 16px;
  border-radius: 16px;
  background-color: white;
  color: black;
`;
