import {
  ArgsDisplayOptions,
  ArgsOf,
  Argument,
  ArgumentTypeName,
  BigIntArgument,
  BooleanArgument,
  DisplayArg,
  NumberArgument,
  ObjectArgument,
  PCD,
  PCDArgument,
  PCDPackage,
  RawValueType,
  StringArgument,
  ToggleList,
  ToogleListArgument,
  isBigIntArgument,
  isBooleanArgument,
  isNumberArgument,
  isObjectArgument,
  isPCDArgument,
  isRevealListArgument,
  isStringArgument,
  isStringArrayArgument,
  isToggleListArgument
} from "@pcd/pcd-types";
import _ from "lodash";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Tooltip } from "react-tooltip";
import styled from "styled-components";
import { usePCDCollection } from "../../src/appHooks";
import { Caption } from "../core";
import { Chip, ChipsContainer } from "../core/Chip";
import { icons } from "../icons";

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
  options
}: {
  args: ArgsOf<T>;
  setArgs: React.Dispatch<React.SetStateAction<ArgsOf<T>>>;
  options?: ArgsDisplayOptions<ArgsOf<T>>;
}) {
  const [showAll, setShowAll] = useState(false);
  const [visible, hidden] = _.partition(
    Object.entries(args),
    ([key]) => options?.[key]?.defaultVisible ?? true
  );

  return (
    <ArgsContainer>
      {visible.map(([key, value]) => (
        <ArgInput
          key={key}
          argName={key}
          arg={value as any}
          setArgs={setArgs}
          defaultArg={options?.[key]}
        />
      ))}
      {hidden.length > 0 && (
        <>
          <ShowMoreButton
            showAll={showAll}
            onClick={() => setShowAll((showAll) => !showAll)}
            size="sm"
          >
            {showAll ? "▼ Hide" : "► Show"} {hidden.length} more inputs
          </ShowMoreButton>
          {showAll &&
            hidden.map(([key, value]) => (
              <ArgInput
                key={key}
                argName={key}
                arg={value as any}
                setArgs={setArgs}
                defaultArg={options?.[key]}
              />
            ))}
        </>
      )}
    </ArgsContainer>
  );
}

export function ArgInput<T extends PCDPackage, ArgName extends string>({
  arg,
  argName,
  setArgs,
  defaultArg
}: {
  arg: ArgsOf<T>[ArgName];
  argName: string;
  setArgs: React.Dispatch<React.SetStateAction<ArgsOf<T>>>;
  defaultArg?: DisplayArg<typeof arg>;
}) {
  const setArg = React.useCallback(
    (value: (typeof arg)["value"]) => {
      setArgs((args) => ({
        ...args,
        [argName]: {
          ...args[argName],
          value
        }
      }));
    },
    [setArgs, argName]
  );

  const isValid = useCallback(
    <A extends Argument<any, any>>(value: RawValueType<A>) =>
      (arg.validatorParams &&
        defaultArg?.validate?.(value, arg.validatorParams)) ??
      true,
    [defaultArg, arg.validatorParams]
  );

  const props = useMemo<ArgInputProps<typeof arg>>(
    () => ({
      // merge arg with default value
      arg: { displayName: _.startCase(argName), ...(defaultArg || {}), ...arg },
      argName,
      setArg,
      isValid
    }),
    [defaultArg, arg, argName, setArg, isValid]
  );

  if (isStringArgument(arg)) {
    return <StringArgInput {...props} />;
  } else if (isNumberArgument(arg)) {
    return <NumberArgInput {...props} />;
  } else if (isBigIntArgument(arg)) {
    return <BigIntArgInput {...props} />;
  } else if (isBooleanArgument(arg)) {
    return <BooleanArgInput {...props} />;
  } else if (isToggleListArgument(arg)) {
    return <ToggleListArgInput {...props} />;
  } else if (isObjectArgument(arg)) {
    return <ObjectArgInput {...props} />;
  } else if (isPCDArgument(arg)) {
    return <PCDArgInput {...props} />;
  } else if (isStringArrayArgument(arg)) {
    return <ObjectArgInput {...props} />;
  } else {
    null;
  }
}

/**
 * Common props for all {@link ArgInput} components
 */
interface ArgInputProps<A extends Argument<any, any>> {
  arg: A;
  argName: string;
  setArg: (value: A["value"]) => void;
  isValid: (arg: RawValueType<A>) => boolean;
}

export function StringArgInput({
  arg,
  setArg,
  ...rest
}: ArgInputProps<StringArgument>) {
  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setArg(e.target.value);
    },
    [setArg]
  );

  return (
    <ArgContainer arg={arg} {...rest}>
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
  setArg,
  ...rest
}: ArgInputProps<NumberArgument>) {
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
        setArg(e.target.value);
        setValid(true);
      } else {
        setValid(false);
      }
    },
    [setArg, validator]
  );

  return (
    <ArgContainer
      arg={arg}
      error={valid ? undefined : "Please enter a number."}
      {...rest}
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
  setArg,
  ...rest
}: ArgInputProps<BigIntArgument>) {
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
        setArg(e.target.value);
        setValid(true);
      } else {
        setValid(false);
      }
    },
    [setArg, validator]
  );

  return (
    <ArgContainer
      arg={arg}
      error={valid ? undefined : "Please enter a whole number."}
      {...rest}
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
  setArg,
  ...rest
}: ArgInputProps<BooleanArgument>) {
  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setArg(e.target.checked);
    },
    [setArg]
  );

  return (
    <ArgContainer
      arg={arg}
      end={
        <input
          type="checkbox"
          checked={arg.value}
          onChange={onChange}
          disabled={!arg.userProvided}
        />
      }
      {...rest}
    />
  );
}

export function ObjectArgInput({
  arg,
  setArg,
  ...rest
}: ArgInputProps<ObjectArgument<any>>) {
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
          setArg(obj);
        })
        .catch((_e) => {
          setLoading(false);
          setLoaded(true);
          console.log(`failed to load ${arg.remoteUrl}`);
        });
    }
  }, [arg.remoteUrl, load, setArg, loaded]);

  const onChange = useCallback((_e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // TODO: parse JSON object, validate it
  }, []);

  return (
    <ArgContainer arg={arg} {...rest}>
      <TextareaInput
        value={JSON.stringify(arg.value, null, 2)}
        onChange={onChange}
        disabled={!arg.userProvided}
      />
    </ArgContainer>
  );
}

function ToggleListArgInput({
  arg,
  setArg,
  ...rest
}: ArgInputProps<ToogleListArgument<ToggleList>>) {
  const [showAll, setShowAll] = useState(arg.userProvided);

  const type = isRevealListArgument(arg) ? "reveal" : "default";
  const getLabel = useCallback(
    (key: string) => {
      switch (type) {
        case "reveal":
          return key.replace(/^reveal/, "");
        default:
          return key;
      }
    },
    [type]
  );
  const getIcon = useCallback(
    (value: boolean) => {
      switch (type) {
        case "reveal":
          return (
            <img
              draggable="false"
              src={value ? icons.eyeOpen : icons.eyeClosed}
              width={18}
              height={18}
            />
          );
        default:
          return undefined;
      }
    },
    [type]
  );

  const entries = useMemo(
    () =>
      showAll
        ? Object.entries(arg.value)
        : Object.entries(arg.value).filter(([_, value]) => value),
    [arg.value, showAll]
  );

  return (
    <ArgContainer
      arg={arg}
      {...rest}
      end={
        <ShowMoreButton
          showAll={showAll}
          onClick={() => setShowAll((showAll) => !showAll)}
          size="lg"
        >
          {showAll ? "-" : "+"}
        </ShowMoreButton>
      }
    >
      <ChipsContainer direction={showAll ? "row" : "column"}>
        {entries.map(([key, value]) => (
          <Chip
            key={key}
            label={getLabel(key)}
            onClick={
              arg.userProvided
                ? () => setArg({ ...arg.value, [key]: !value })
                : undefined
            }
            checked={value}
            icon={getIcon(value)}
          />
        ))}
      </ChipsContainer>
    </ArgContainer>
  );
}

export function PCDArgInput({
  arg,
  setArg,
  isValid,
  ...rest
}: ArgInputProps<PCDArgument>) {
  const pcdCollection = usePCDCollection();
  const relevantPCDs = useMemo(
    () =>
      pcdCollection
        .getAll()
        .filter((pcd) => isValid(pcd) && pcd.type === arg.pcdType),
    [pcdCollection, isValid, arg]
  );

  const setPCDById = useCallback(
    async (id: string) => {
      const pcd = pcdCollection.getById(id);
      const value = pcd ? await pcdCollection.serialize(pcd) : undefined;
      setArg(value);
    },
    [pcdCollection, setArg]
  );

  const onChange = useCallback(
    async (e: React.ChangeEvent<HTMLSelectElement>) => {
      setPCDById(e.target.value);
    },
    [setPCDById]
  );

  const [pcd, setPCD] = useState<PCD | undefined>();
  const defaultPCD = relevantPCDs[0];
  const pcdSet = !!pcd;
  useEffect(() => {
    if (!pcdSet && defaultPCD) {
      setPCDById(defaultPCD.id);
    }
  }, [pcdSet, defaultPCD, setPCDById]);
  useEffect(() => {
    if (arg.value) {
      pcdCollection.deserialize(arg.value).then(setPCD);
    } else {
      setPCD(undefined);
    }
  }, [arg.value, pcdCollection]);

  return (
    <ArgContainer arg={arg} {...rest}>
      {relevantPCDs.length ? (
        <Select
          value={pcd?.id || "none"}
          onChange={onChange}
          disabled={relevantPCDs.length === 0}
        >
          {relevantPCDs.map((pcd) => {
            const pcdPackage = pcdCollection.getPackage(pcd.type);
            return (
              <option key={pcd.id} value={pcd.id}>
                {pcdPackage?.getDisplayOptions(pcd)?.displayName ?? pcd.type}
              </option>
            );
          })}
        </Select>
      ) : (
        <ErrorText>No eligible {arg.displayName || "PCD"}s found</ErrorText>
      )}
    </ArgContainer>
  );
}

function ArgContainer({
  arg: { argumentType, displayName, description, hideIcon },
  error,
  children,
  end
}: {
  arg: Argument<any, any>;
  error?: string;
  children?: React.ReactNode;
  /* optional element place at the end */
  end?: React.ReactNode;
}) {
  return (
    <ArgItemContainer>
      {!hideIcon && (
        <ArgItemIcon
          src={argTypeIcons[argumentType]}
          draggable={false}
          aria-label={argumentType}
          title={argumentType}
        />
      )}
      <ArgItem>
        <ArgName>
          {displayName ? (
            <>
              <Caption>{displayName}</Caption>
              {description && (
                <a
                  data-tooltip-id={`arg-input-tooltip-${_.kebabCase(
                    displayName
                  )}`}
                  data-tooltip-content={description}
                >
                  <TooltipIcon
                    src={icons.info}
                    width={14}
                    height={14}
                    draggable={false}
                  />
                </a>
              )}
              <TooltipContainer
                id={`arg-input-tooltip-${_.kebabCase(displayName)}`}
              />
            </>
          ) : (
            description && <Description>{description}</Description>
          )}
          <End>{end}</End>
        </ArgName>
        {children}
        <ErrorText>{error}</ErrorText>
      </ArgItem>
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
  ToggleList: icons.inputObject,
  PCD: icons.inputPcd,
  Unknown: icons.question
};

const ArgName = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const Description = styled.div`
  font-size: 14px;
  color: var(--white);
`;

const End = styled.div`
  margin-left: auto;
  margin-right: 8px;
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

  :disabled {
    background: none;
  }
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

const ShowMoreButton = styled.a<{ showAll: boolean; size: "sm" | "lg" }>`
  flex: 1;
  color: var(--white);
  font-size: ${({ size }) => (size === "sm" ? "14px" : "18px")};
  font-weight: ${({ size }) => (size === "sm" ? "normal" : "bold")};
  cursor: pointer;
  text-decoration: none;
`;
