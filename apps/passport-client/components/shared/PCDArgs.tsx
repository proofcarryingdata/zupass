import { PCDCollection } from "@pcd/pcd-collection";
import {
  ArgsOf,
  Argument,
  ArgumentTypeName,
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
      <Row>
        <ArgName>
          {argName}
          <ArgTypeLabel argType={arg.argumentType} />
        </ArgName>
      </Row>
      <Row>
        <Description>{arg.description}</Description>
      </Row>
      <Row>
        <InputContainer>
          <input
            value={arg.value}
            onChange={onChange}
            disabled={!arg.userProvided}
          />
        </InputContainer>
      </Row>
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
  const [valid, setValid] = useState(true);
  const validator = useCallback((arg: string): boolean => {
    try {
      const integer = parseInt(arg);
      if (isNaN(integer)) return false;
      return true;
    } catch (e) {
      return false;
    }
  }, []);

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (validator(e.target.value)) {
        args[argName].value = e.target.value;
        setArgs(JSON.parse(JSON.stringify(args)));
        setValid(true);
      } else {
        setValid(false);
      }
    },
    [args, setArgs, argName, validator]
  );

  return (
    <ArgContainer>
      <Row>
        <ArgName>
          {argName}
          <ArgTypeLabel argType={arg.argumentType} />
        </ArgName>
      </Row>
      <Row>
        <Description>{arg.description}</Description>
      </Row>
      <Row>
        <InputContainer>
          <input
            value={arg.value}
            onChange={onChange}
            disabled={!arg.userProvided}
          />
        </InputContainer>
      </Row>
      <Row>
        {!valid && <ErrorContainer>Error parsing your input</ErrorContainer>}
      </Row>
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
  const [valid, setValid] = useState(true);
  const validator = useCallback((arg: string): boolean => {
    try {
      BigInt(arg);
      return true;
    } catch (e) {
      return false;
    }
  }, []);

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (validator(e.target.value)) {
        args[argName].value = e.target.value;
        setArgs(JSON.parse(JSON.stringify(args)));
        console.log("changing argument");
        setValid(true);
      } else {
        setValid(false);
      }
    },
    [args, setArgs, argName, validator]
  );

  return (
    <ArgContainer>
      <Row>
        <ArgName>
          {argName}
          <ArgTypeLabel argType={arg.argumentType} />
        </ArgName>
      </Row>
      <Row>
        <Description>{arg.description}</Description>
      </Row>
      <Row>
        <InputContainer>
          <input
            value={arg.value ?? ""}
            onChange={onChange}
            disabled={!arg.userProvided}
          />
        </InputContainer>
      </Row>
      <Row>
        {!valid && <ErrorContainer>Error parsing your input</ErrorContainer>}
      </Row>
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
      <Row>
        <ArgName>
          {argName}
          <ArgTypeLabel argType={arg.argumentType} />
        </ArgName>
      </Row>
      <Row>
        <Description>{arg.description}</Description>
      </Row>
      <Row>
        <InputContainer>
          <input
            value={arg.value}
            onChange={onChange}
            disabled={!arg.userProvided}
          />
        </InputContainer>
      </Row>
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
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    console.log(`loading ${arg.remoteUrl}`);
    const res = await fetch(arg.remoteUrl);
    const result = await res.json();
    console.log(`loaded ${arg.remoteUrl}:`, result);
    return result;
  }, [arg.remoteUrl]);

  useEffect(() => {
    if (arg.remoteUrl && !loaded) {
      setLoading(true);
      load()
        .then((obj) => {
          setLoading(false);
          setLoaded(true);
          args[argName].value = obj;
          setArgs(JSON.parse(JSON.stringify(args)));
        })
        .catch((_e) => {
          setLoading(false);
          setLoaded(true);
          console.log(`failed to load ${arg.remoteUrl}`);
        });
    }
  }, [arg.remoteUrl, argName, args, load, setArgs, loaded]);

  const onChange = useCallback((_e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // TODO: parse JSON object, validate it
  }, []);

  return (
    <ArgContainer>
      <Row>
        <ArgName>
          {argName}
          <ArgTypeLabel argType={arg.argumentType} />
        </ArgName>
      </Row>
      <Row>
        <Description>{arg.description}</Description>
      </Row>
      <Row>
        <InputContainer>
          <textarea
            style={{
              width: "100%",
              height: "4em",
            }}
            value={JSON.stringify(arg.value)}
            onChange={onChange}
            disabled={!arg.userProvided}
          />
        </InputContainer>
      </Row>
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

      console.log(id, pcd);

      if (pcd) {
        const serialized = await pcdCollection.serialize(pcd);
        args[argName].value = serialized;
        setArgs(JSON.parse(JSON.stringify(args)));
      } else {
        args[argName].value = undefined;
        setArgs(JSON.parse(JSON.stringify(args)));
      }
    },
    [argName, args, setArgs, pcdCollection]
  );

  useEffect(() => {
    async function deserialize() {
      console.log("deserializing");
      try {
        const parsed = await pcdCollection.deserialize(arg.value);
        setValue(parsed);
      } catch (e) {
        setValue({ id: "none" } as any);
      }
    }

    deserialize();
  }, [arg.value, pcdCollection]);

  return (
    <ArgContainer>
      <Row>
        <ArgName>
          {argName}
          <ArgTypeLabel argType={arg.argumentType} />
        </ArgName>
      </Row>
      <Row>
        <Description>{arg.description}</Description>
      </Row>
      <Row>
        <InputContainer>
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
        </InputContainer>
      </Row>
    </ArgContainer>
  );
}

const Row = styled.div`
  width: 100%;
`;

const Description = styled.div`
  padding: 10px 10px 0px 10px;
`;

const InputContainer = styled.div`
  padding: 10px;
`;

const ArgName = styled.div`
  padding: 2px 4px;
  font-weight: bold;
  width: 100%;
  padding: 10px 10px 0px 10px;
  display: flex;
  justify-content: flex-start;
  align-items: center;
`;

const ArgContainer = styled.div`
  background-color: white;
  border-radius: 8px;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: stretch;
  flex-direction: column;
  overflow: hidden;
`;

const ArgsContainer = styled.div`
  border-radius: 16px;
  color: black;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  gap: 16px;
  color: var(--bg-dark-primary);
  background-color: white;
  border: 1px solid var(--accent-lite);
  overflow: hidden;
  padding: 16px 0px 16px 0px;
`;

export function ArgTypeLabel({ argType }: { argType: ArgumentTypeName }) {
  return <ArgTypeNameContainer>{argType}</ArgTypeNameContainer>;
}

const ArgTypeNameContainer = styled.span`
  padding: 0px 5px;
  border-radius: 8px;
  /* background-color: var(--accent-/lite); */
  border: 1px solid black;
  font-size: 0.8em;
  margin-left: 0.5em;
`;

const ErrorContainer = styled.div`
  padding: 0px 10px 0px 10px;
  color: var(--danger);
`;
