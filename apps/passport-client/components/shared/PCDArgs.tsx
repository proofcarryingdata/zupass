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
import { FaCheck, FaHashtag, FaQuestion } from "react-icons/fa";
import { FaInfo, FaList, FaRegEye, FaRegEyeSlash } from "react-icons/fa6";
import { GrDocumentLocked } from "react-icons/gr";
import { TbLetterT } from "react-icons/tb";
import { Tooltip } from "react-tooltip";
import styled from "styled-components";
import { usePCDCollection } from "../../src/appHooks";
import { Caption } from "../core";
import { Chip, ChipsContainer } from "../core/Chip";
import Select from "./Select";

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
}): JSX.Element {
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
          arg={value}
          setArgs={setArgs}
          defaultArg={options?.[key]}
        />
      ))}
      {hidden.length > 0 && (
        <>
          <ShowMoreButton
            onClick={(): void => setShowAll((showAll) => !showAll)}
          >
            {showAll ? "▼ Hide" : "▶ Show"} {hidden.length} more inputs
          </ShowMoreButton>
          {
            /**
             * NB: we have to render all the hidden inputs so that the
             * any default value can be automatically set.
             */
            hidden.map(([key, value]) => (
              <ArgInput
                key={key}
                argName={key}
                arg={value}
                setArgs={setArgs}
                defaultArg={options?.[key]}
                hidden={!showAll}
              />
            ))
          }
        </>
      )}
    </ArgsContainer>
  );
}

export function ArgInput<T extends PCDPackage, ArgName extends string>({
  arg,
  argName,
  setArgs,
  defaultArg,
  hidden
}: {
  arg: ArgsOf<T>[ArgName];
  argName: string;
  setArgs: React.Dispatch<React.SetStateAction<ArgsOf<T>>>;
  defaultArg?: DisplayArg<typeof arg>;
  hidden?: boolean;
}): JSX.Element {
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
    <A extends Argument<ArgumentTypeName, unknown>>(value: RawValueType<A>) =>
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
      isValid,
      hidden
    }),
    [defaultArg, arg, argName, setArg, isValid, hidden]
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
interface ArgInputProps<A extends Argument<ArgumentTypeName, unknown>> {
  arg: A;
  argName: string;
  setArg: (value: A["value"]) => void;
  isValid: (arg: RawValueType<A>) => boolean;
}

export function StringArgInput({
  arg,
  setArg,
  ...rest
}: ArgInputProps<StringArgument>): JSX.Element {
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
}: ArgInputProps<NumberArgument>): JSX.Element {
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
}: ArgInputProps<BigIntArgument>): JSX.Element {
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
}: ArgInputProps<BooleanArgument>): JSX.Element {
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
}: ArgInputProps<ObjectArgument<unknown>>): JSX.Element {
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
}: ArgInputProps<ToogleListArgument<ToggleList>>): JSX.Element {
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
          return value ? <FaRegEye size={18} /> : <FaRegEyeSlash size={18} />;
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
        entries.length ? (
          <ShowMoreButton
            onClick={(): void => setShowAll((showAll) => !showAll)}
          >
            {showAll ? "▲" : "▼"}
          </ShowMoreButton>
        ) : undefined
      }
    >
      {!!entries.length && (
        <ChipsContainer direction={showAll ? "row" : "column"}>
          {entries.map(([key, value]) => (
            <Chip
              key={key}
              label={getLabel(key)}
              onClick={
                arg.userProvided
                  ? (): void => setArg({ ...arg.value, [key]: !value })
                  : undefined
              }
              checked={value}
              icon={getIcon(value)}
            />
          ))}
        </ChipsContainer>
      )}
    </ArgContainer>
  );
}

export function PCDArgInput({
  arg,
  setArg,
  isValid,
  ...rest
}: ArgInputProps<PCDArgument>): JSX.Element {
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

  type Option = {
    id: string;
    label: string;
  };
  const options = useMemo<Option[]>(
    () =>
      relevantPCDs.map((pcd) => {
        const pcdPackage = pcdCollection.getPackage(pcd.type);
        return {
          id: pcd.id,
          label: pcdPackage?.getDisplayOptions(pcd)?.displayName ?? pcd.type
        };
      }),
    [relevantPCDs, pcdCollection]
  );
  const onChange = useCallback(
    (option: Option) => {
      setPCDById(option.id);
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
    <ArgContainer
      arg={arg}
      {...rest}
      error={
        !relevantPCDs.length &&
        (arg.validatorParams?.notFoundMessage ||
          "You do not have an eligible PCD.")
      }
    >
      {!!relevantPCDs.length && (
        <Select
          value={options.find((option) => option.id === pcd?.id)}
          options={options}
          onChange={onChange}
          isDisabled={!arg.userProvided}
        />
      )}
    </ArgContainer>
  );
}

function ArgContainer({
  arg: { argumentType, displayName, description, hideIcon },
  hidden,
  error,
  children,
  end
}: {
  arg: Argument<ArgumentTypeName, unknown>;
  hidden?: boolean;
  error?: string;
  children?: React.ReactNode;
  /* optional element place at the end */
  end?: React.ReactNode;
}): JSX.Element {
  return (
    <ArgItemContainer hidden={hidden} error={!!error}>
      {!hideIcon && (
        <ArgItemIcon
          draggable={false}
          aria-label={argumentType}
          title={argumentType}
        >
          {argTypeIcons[argumentType]}
        </ArgItemIcon>
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
                  <TooltipIcon draggable={false}>
                    <FaInfo />
                  </TooltipIcon>
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
        {error && <ErrorText>{error}</ErrorText>}
      </ArgItem>
    </ArgItemContainer>
  );
}

const argTypeIcons: Record<ArgumentTypeName, JSX.Element> = {
  PCD: <GrDocumentLocked />,
  String: <TbLetterT />,
  Number: <FaHashtag />,
  BigInt: <FaHashtag />,
  Object: <FaList />,
  StringArray: <FaList />,
  ToggleList: <FaList />,
  Boolean: <FaCheck />,
  Unknown: <FaQuestion />
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

const ArgItemContainer = styled.div<{ hidden: boolean; error: boolean }>`
  border-radius: 16px;
  border: 1px solid;
  border-color: ${({ error }): string =>
    error ? "var(--danger)" : "var(--primary-lite)"};
  background-color: rgba(var(--white-rgb), 0.01);
  align-items: center;
  padding: 8px 16px;
  gap: 16px;
  display: ${({ hidden }): string => (hidden ? "none" : "flex")};
`;

const ArgItemIcon = styled.div`
  svg {
    fill: #fff;
    width: 18px;
    height: 18px;
  }
  filter: opacity(0.8);
`;

const TooltipIcon = styled.div`
  svg {
    fill: #fff;
    width: 12px;
    height: 12px;
  }
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
  color: var(--danger-bright);
  font-size: 14px;
`;

const Input = styled.input`
  width: 100%;
  height: 32px;
  background-color: var(--bg-lite-primary);
  border: 1px solid var(--bg-lite-primary);
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
  background-color: var(--bg-lite-primary);
  border: 1px solid var(--bg-lite-primary);
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

const ShowMoreButton = styled.a`
  flex: 1;
  color: var(--white);
  font-size: 14px;
  cursor: pointer;
  text-decoration: none;
`;
