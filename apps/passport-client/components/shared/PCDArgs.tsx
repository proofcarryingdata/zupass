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
import React, { useCallback, useEffect, useState } from "react";
import styled from "styled-components";

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
    <ArgContainer>
      <Row>
        <ArgName>
          {argName}
          <ArgTypeLabel argType={arg.argumentType} />
        </ArgName>
      </Row>
      {arg.description && (
        <Row>
          <Description>{arg.description}</Description>
        </Row>
      )}
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
    <ArgContainer>
      <Row>
        <ArgName>
          {argName}
          <ArgTypeLabel argType={arg.argumentType} />
        </ArgName>
      </Row>
      {arg.description && (
        <Row>
          <Description>{arg.description}</Description>
        </Row>
      )}
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
    <ArgContainer>
      <Row>
        <ArgName>
          {argName}
          <ArgTypeLabel argType={arg.argumentType} />
        </ArgName>
      </Row>
      {arg.description && (
        <Row>
          <Description>{arg.description}</Description>
        </Row>
      )}
      <Row>
        <InputContainer>
          <Input
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
    <ArgContainer>
      <Row>
        <ArgName>
          {argName}
          <ArgTypeLabel argType={arg.argumentType} />
        </ArgName>
      </Row>
      {arg.description && (
        <Row>
          <Description>{arg.description}</Description>
        </Row>
      )}
      <Row>
        <InputContainer>
          <input
            type="checkbox"
            checked={arg.value}
            onChange={onChange}
            disabled={!arg.userProvided}
          />
        </InputContainer>
      </Row>
    </ArgContainer>
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
    <ArgContainer>
      <Row>
        <ArgName>
          {argName}
          <ArgTypeLabel argType={arg.argumentType} />
        </ArgName>
      </Row>
      {arg.description && (
        <Row>
          <Description>{arg.description}</Description>
        </Row>
      )}
      <Row>
        <InputContainer>
          <textarea
            style={{
              width: "100%",
              height: "4em"
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
    <ArgContainer>
      <Row>
        <ArgName>
          {argName}
          <ArgTypeLabel argType={arg.argumentType} />
        </ArgName>
      </Row>
      {arg.description && (
        <Row>
          <Description>{arg.description}</Description>
        </Row>
      )}
      <Row>
        <InputContainer>
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
  align-items: baseline;
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
  width: 100%;
  border-radius: 16px;
  color: black;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  gap: 8px;
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

const Select = styled.select`
  width: 100%;
  height: 32px;
  border-radius: 4px;
`;

const Input = styled.input`
  width: 100%;
  height: 32px;
`;
