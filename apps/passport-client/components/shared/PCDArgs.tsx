import React, { useCallback, useEffect, useState } from "react";

import _ from "lodash";
import { Tooltip } from "react-tooltip";
import styled from "styled-components";

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
  StringArgument
} from "@pcd/pcd-types";

import { Caption } from "../core";
import { icons } from "../icons";

type ArgSetter = (argName: string, value: any) => void;

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
  pcdCollection
}: {
  args: ArgsOf<T>;
  setArgs: React.Dispatch<React.SetStateAction<ArgsOf<T>>>;
  pcdCollection: PCDCollection;
}) {
  const entries = Object.entries(args);

  const setArg = React.useCallback(
    (argName: string, value: any) => {
      setArgs((args) => ({
        ...args,
        [argName]: {
          ...args[argName],
          value
        }
      }));
    },
    [setArgs]
  );

  return (
    <ArgsContainer>
      {entries.map(([key, value], i) => (
        <ArgInput
          pcdCollection={pcdCollection}
          key={i}
          argName={key}
          arg={value as any}
          setArg={setArg}
        />
      ))}
    </ArgsContainer>
  );
}

export function ArgInput({
  arg,
  argName,
  setArg,
  pcdCollection
}: {
  arg: Argument<any, any>;
  argName: string;
  setArg: ArgSetter;
  pcdCollection: PCDCollection;
}) {
  if (isStringArgument(arg)) {
    return <StringArgInput arg={arg} argName={argName} setArg={setArg} />;
  } else if (isNumberArgument(arg)) {
    return <NumberArgInput arg={arg} argName={argName} setArg={setArg} />;
  } else if (isBigIntArgument(arg)) {
    return <BigIntArgInput arg={arg} argName={argName} setArg={setArg} />;
  } else if (isBooleanArgument(arg)) {
    return <BooleanArgInput arg={arg} argName={argName} setArg={setArg} />;
  } else if (isObjectArgument(arg)) {
    return <ObjectArgInput arg={arg} argName={argName} setArg={setArg} />;
  } else if (isPCDArgument(arg)) {
    return (
      <PCDArgInput
        arg={arg}
        argName={argName}
        setArg={setArg}
        pcdCollection={pcdCollection}
      />
    );
  }
}

export function StringArgInput({
  arg,
  argName,
  setArg
}: {
  arg: StringArgument;
  argName: string;
  setArg: ArgSetter;
}) {
  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setArg(argName, e.target.value);
    },
    [argName, setArg]
  );

  return (
    <ArgContainer argName={argName} arg={arg}>
      <input
        value={arg.value}
        onChange={onChange}
        disabled={!arg.userProvided}
      />
    </ArgContainer>
  );
}

export function NumberArgInput({
  arg,
  argName,
  setArg
}: {
  arg: NumberArgument;
  argName: string;
  setArg: ArgSetter;
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
        setArg(argName, e.target.value);
        setValid(true);
      } else {
        setValid(false);
      }
    },
    [setArg, argName, validator]
  );

  return (
    <ArgContainer
      argName={argName}
      arg={arg}
      error={valid ? undefined : "Please enter a number."}
    >
      <input
        value={arg.value}
        onChange={onChange}
        disabled={!arg.userProvided}
      />
    </ArgContainer>
  );
}

export function BigIntArgInput({
  arg,
  argName,
  setArg
}: {
  arg: BigIntArgument;
  argName: string;
  setArg: ArgSetter;
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
        setArg(argName, e.target.value);
        setValid(true);
      } else {
        setValid(false);
      }
    },
    [setArg, argName, validator]
  );

  return (
    <ArgContainer
      argName={argName}
      arg={arg}
      error={valid ? undefined : "Please enter a whole number."}
    >
      <Input
        value={arg.value ?? ""}
        onChange={onChange}
        disabled={!arg.userProvided}
      />
    </ArgContainer>
  );
}

export function BooleanArgInput({
  arg,
  argName,
  setArg
}: {
  arg: BooleanArgument;
  argName: string;
  setArg: ArgSetter;
}) {
  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setArg(argName, e.target.checked);
    },
    [setArg, argName]
  );

  return (
    <ArgContainer
      argName={argName}
      arg={arg}
      end={
        <input
          type="checkbox"
          checked={arg.value}
          onChange={onChange}
          disabled={!arg.userProvided}
        />
      }
    />
  );
}

export function ObjectArgInput({
  arg,
  argName,
  setArg
}: {
  arg: ObjectArgument<any>;
  argName: string;
  setArg: ArgSetter;
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
          setArg(argName, obj);
        })
        .catch((_e) => {
          setLoading(false);
          setLoaded(true);
          console.log(`failed to load ${arg.remoteUrl}`);
        });
    }
  }, [arg.remoteUrl, argName, load, setArg, loaded]);

  const onChange = useCallback((_e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // TODO: parse JSON object, validate it
  }, []);

  return (
    <ArgContainer argName={argName} arg={arg}>
      <TextareaInput
        value={JSON.stringify(arg.value, null, 2)}
        onChange={onChange}
        disabled={!arg.userProvided}
      />
    </ArgContainer>
  );
}

export function PCDArgInput({
  arg,
  argName,
  setArg,
  pcdCollection
}: {
  arg: PCDArgument;
  argName: string;
  setArg: ArgSetter;
  pcdCollection: PCDCollection;
}) {
  const relevantPCDs = pcdCollection.getAll().filter((pcd) => {
    return arg.pcdType === undefined || pcd.type === arg.pcdType;
  });
  const defaultPCD = relevantPCDs.length === 1 ? relevantPCDs[0] : undefined;
  const [hasSetDefault, setHasSetDefault] = useState(false);

  const [value, setValue] = useState<PCD | undefined>(undefined);

  const setPCDById = useCallback(
    async (id: string) => {
      const pcd = pcdCollection.getById(id);
      const value = pcd ? await pcdCollection.serialize(pcd) : undefined;
      setArg(argName, value);
    },
    [argName, pcdCollection, setArg]
  );

  const onChange = useCallback(
    async (e: React.ChangeEvent<HTMLSelectElement>) => {
      const id = e.target.value;
      return setPCDById(id);
    },
    [setPCDById]
  );

  useEffect(() => {
    if (!hasSetDefault && defaultPCD) {
      setHasSetDefault(true);
      setPCDById(defaultPCD.id);
    }
  }, [defaultPCD, hasSetDefault, setPCDById]);

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
    <ArgContainer argName={argName} arg={arg}>
      <Select value={value?.id} onChange={onChange}>
        <option key="none" value="none" disabled>
          Please select a {argName}
        </option>
        {relevantPCDs.map((pcd) => {
          const pcdPackage = pcdCollection.getPackage(pcd.type);
          return (
            <option key={pcd.id} value={pcd.id}>
              {pcdPackage?.getDisplayOptions(pcd)?.displayName ?? pcd.type}
            </option>
          );
        })}
      </Select>
    </ArgContainer>
  );
}

function ArgContainer({
  argName,
  arg,
  error,
  children,
  end
}: {
  argName: string;
  arg: Argument<any, any>;
  error?: string;
  children?: React.ReactNode;
  /* optional element place at the end */
  end?: React.ReactNode;
}) {
  return (
    <ArgItemContainer>
      <ArgItemIcon
        src={argTypeIcons[arg.argumentType]}
        draggable={false}
        aria-label={arg.argumentType}
        title={arg.argumentType}
      />
      <ArgItem>
        <ArgName>
          <Caption>{_.startCase(argName)} </Caption>
          {arg.description && (
            <a
              data-tooltip-id={`arg-input-tooltip-${argName}`}
              data-tooltip-content={arg.description}
            >
              <TooltipIcon
                src={icons.info}
                width={14}
                height={14}
                draggable={false}
              />
            </a>
          )}
          <TooltipContainer id={`arg-input-tooltip-${argName}`} />
        </ArgName>
        {children}
        <ErrorText>{error}</ErrorText>
      </ArgItem>
      {end}
    </ArgItemContainer>
  );
}

const argTypeIcons: Record<ArgumentTypeName, string> = {
  String: icons.inputText,
  Number: icons.inputNumber,
  BigInt: icons.inputNumber,
  Boolean: icons.checkmark,
  StringArray: icons.inputObject,
  Object: icons.inputObject,
  PCD: icons.inputPcd,
  Unknown: icons.question
};

const ArgName = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const ArgItemContainer = styled.div`
  border-radius: 16px;
  border: 1px solid var(--bg-lite-gray);
  background-color: rgba(var(--white-rgb), 0.01);
  display: flex;
  align-items: center;
  padding: 8px 16px;
  gap: 16px;
`;

const ArgItemIcon = styled.img`
  width: 18px;
  height: 18px;
  filter: opacity(0.8);
`;

const TooltipIcon = styled.img`
  width: 12px;
  height: 12px;
  filter: opacity(0.8);
`;

const TooltipContainer = styled(Tooltip)`
  max-width: min(calc(100vw - 32px), 420px);
`;

const ArgItem = styled.div`
  display: flex;
  justify-content: center;
  align-items: stretch;
  flex-direction: column;
  gap: 8px;
  flex: 1;
`;

const ArgsContainer = styled.div`
  width: 100%;
  display: flex;
  align-items: stretch;
  flex-direction: column;
  gap: 8px;
  color: var(--white);
`;

const ErrorText = styled.div`
  color: var(--danger);
`;

const Select = styled.select`
  width: 100%;
  height: 32px;
  border-radius: 4px;
  color: var(--white);
  background-color: var(--bg-lite-gray);
  padding: 0 24px 0 8px;
  font:
    14px PlexSans,
    system-ui,
    sans-serif;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  background: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' fill='%23FFF'><polygon points='0,0 100,0 50,50'/></svg>")
    no-repeat;
  background-size: 12px;
  background-position: calc(100% - 8px) 12px;
  background-repeat: no-repeat;
`;

const Input = styled.input`
  width: 100%;
  height: 32px;
  background-color: var(--bg-lite-gray);
  border: 1px solid var(--bg-lite-gray);
  color: var(--white);
  font:
    14px PlexSans,
    system-ui,
    sans-serif;

  &:disabled {
    opacity: 0.5;
  }
`;

const TextareaInput = styled.textarea`
  width: 100%;
  height: 4em;
  background-color: var(--bg-lite-gray);
  border: 1px solid var(--bg-lite-gray);
  color: var(--white);
  resize: vertical;
  font:
    14px PlexSans,
    system-ui,
    sans-serif;

  &:disabled {
    opacity: 0.5;
  }
`;
