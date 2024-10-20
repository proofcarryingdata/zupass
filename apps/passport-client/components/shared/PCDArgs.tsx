import { ProveOptions } from "@pcd/passport-interface";
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
  PrimitiveArgumentTypeName,
  RawValueType,
  StringArgument,
  ToggleList,
  ToogleListArgument,
  isBigIntArgument,
  isBooleanArgument,
  isNumberArgument,
  isObjectArgument,
  isPCDArgument,
  isRecordContainerArgument,
  isRevealListArgument,
  isStringArgument,
  isStringArrayArgument,
  isToggleListArgument
} from "@pcd/pcd-types";
import _ from "lodash";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { SingleValue } from "react-select";
import styled from "styled-components";
import {
  useDispatch,
  usePCDCollection,
  useProveState
} from "../../src/appHooks";
import Select from "./Select";
import { Accordion, AccordionRef } from "../../new-components/shared/Accordion";
import { Typography } from "../../new-components/shared/Typography";
import { Button2 } from "../../new-components/shared/Button";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/16/solid";
import { EdDSATicketPCDTypeName } from "@pcd/eddsa-ticket-pcd";
import { PODTicketPCDTypeName } from "@pcd/pod-ticket-pcd";

/**
 * Type used in `PCDArgs` for record container argument flattening process.
 */
type FlattenedArgTriple = [
  string | undefined,
  string,
  Argument<PrimitiveArgumentTypeName>
];

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
  options,
  proveOptions
}: {
  args: ArgsOf<T>;
  setArgs: React.Dispatch<React.SetStateAction<ArgsOf<T>>>;
  options?: ArgsDisplayOptions<ArgsOf<T>>;
  proveOptions?: ProveOptions;
}): JSX.Element {
  const [showAll, setShowAll] = useState(false);

  // Flatten record container arguments (if any), keeping track of the parent
  // argument to properly mutate (cf. `setArg`) as well as inheriting argument
  // fields from the record container argument.  Validator parameters are also
  // combined.
  const flattenedArgs: FlattenedArgTriple[] = Object.entries(args).flatMap(
    ([argName, arg]: [
      string,
      Argument<ArgumentTypeName>
    ]): FlattenedArgTriple[] => {
      if (isRecordContainerArgument(arg)) {
        const recordArgPairs = Object.entries(arg.value ?? {});
        const { value: _v, argumentType: _t, ...recordArgs } = arg;
        return recordArgPairs.map(
          ([childArgName, childArg]: [
            string,
            Argument<PrimitiveArgumentTypeName>
          ]) => [
            argName,
            childArgName,
            {
              ...recordArgs,
              ...childArg,
              validatorParams: {
                ...(recordArgs.validatorParams ?? {}),
                ...(childArg.validatorParams ?? {})
              }
            }
          ]
        );
      } else {
        return [
          [undefined, argName, arg as Argument<PrimitiveArgumentTypeName>]
        ];
      }
    }
  );
  const [visible, hidden] = _.partition(
    flattenedArgs,
    ([parentArgName, argName, arg]) =>
      arg.defaultVisible ??
      options?.[parentArgName ?? argName]?.defaultVisible ??
      true
  );

  return (
    <ArgsContainer>
      <ArgsInnerContainer>
        {visible.map(([parentKey, key, value]) => {
          return (
            <ArgInput
              key={parentKey !== undefined ? `${parentKey}.${key}` : key}
              argName={key}
              parentArgName={parentKey}
              arg={value}
              setArgs={setArgs}
              defaultArg={options?.[parentKey ?? key]}
              proveOptions={proveOptions}
            />
          );
        })}
        {hidden.length > 0 &&
          /**
           * NB: we have to render all the hidden inputs so that
           * any default value can be automatically set.
           */
          hidden.map(([parentKey, key, value]) => (
            <ArgInput
              key={parentKey !== undefined ? `${parentKey}.${key}` : key}
              argName={key}
              parentArgName={parentKey}
              arg={value}
              setArgs={setArgs}
              defaultArg={options?.[parentKey ?? key]}
              hidden={!showAll}
              proveOptions={proveOptions}
            />
          ))}
      </ArgsInnerContainer>
      {hidden.length > 0 && (
        <Button2
          style={{ marginTop: "auto" }}
          variant="secondary"
          onClick={(): void => setShowAll((showAll) => !showAll)}
        >
          {showAll ? (
            <ShowMoreButtonInnerContainer>
              <EyeSlashIcon width={20} height={20} />
              <Typography>Hide {hidden.length} more inputs</Typography>
            </ShowMoreButtonInnerContainer>
          ) : (
            <ShowMoreButtonInnerContainer>
              <EyeIcon width={20} height={20} />
              <Typography>Show {hidden.length} more inputs</Typography>
            </ShowMoreButtonInnerContainer>
          )}
        </Button2>
      )}
    </ArgsContainer>
  );
}

export function ArgInput<T extends PCDPackage, ArgName extends string>({
  arg,
  argName,
  parentArgName,
  setArgs,
  defaultArg,
  hidden,
  proveOptions
}: {
  arg: ArgsOf<T>[ArgName];
  argName: string;
  parentArgName: string | undefined;
  setArgs: React.Dispatch<React.SetStateAction<ArgsOf<T>>>;
  defaultArg?: DisplayArg<typeof arg>;
  proveOptions?: ProveOptions;
  hidden?: boolean;
}): JSX.Element | undefined {
  // Go one level deeper in case the arg arises from a record.
  const setArg = React.useCallback(
    (value: (typeof arg)["value"]) => {
      setArgs((args) => {
        // If we are dealing with an argument that has not been pulled out of a
        // record container, mutate `args.argName.value`.
        if (parentArgName === undefined) {
          return {
            ...args,
            [argName]: {
              ...args[argName],
              value
            }
          };
        } /* Else mutate `args.parentArgName.value.argName.value`. */ else {
          return {
            ...args,
            [parentArgName]: {
              ...args[parentArgName],
              value: {
                ...args[parentArgName].value,
                [argName]: {
                  ...args[parentArgName].value[argName],
                  value
                }
              }
            }
          };
        }
      });
    },
    [setArgs, parentArgName, argName]
  );

  // Call `validate` appropriately if the argument arises from a record container.
  const isValid = useCallback(
    <A extends Argument<ArgumentTypeName, unknown>>(value: RawValueType<A>) =>
      (arg.validatorParams &&
        (parentArgName !== undefined
          ? defaultArg?.validate?.(argName, value, arg.validatorParams)
          : defaultArg?.validate?.(value, arg.validatorParams))) ??
      true,
    [defaultArg, parentArgName, argName, arg.validatorParams]
  );

  const props = useMemo<ArgInputProps<typeof arg>>(() => {
    // Qualify argument name if it arises from a record container.
    const qualifiedArgName =
      (parentArgName !== undefined ? `${parentArgName}.` : "") + argName;
    return {
      // merge arg with default value
      arg: {
        displayName: _.startCase(qualifiedArgName),
        ...(defaultArg || {}),
        ...arg
      },
      proveOptions,
      argName,
      setArg,
      isValid,
      hidden
    };
  }, [
    parentArgName,
    argName,
    defaultArg,
    arg,
    proveOptions,
    setArg,
    isValid,
    hidden
  ]);

  if (isStringArgument(arg)) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return <StringArgInput {...props} />;
  } else if (isNumberArgument(arg)) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return <NumberArgInput {...props} />;
  } else if (isBigIntArgument(arg)) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return <BigIntArgInput {...props} />;
  } else if (isBooleanArgument(arg)) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return <BooleanArgInput {...props} />;
  } else if (isToggleListArgument(arg)) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return <ToggleListArgInput {...props} />;
  } else if (isObjectArgument(arg)) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return <ObjectArgInput {...props} />;
  } else if (isPCDArgument(arg)) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return <PCDArgInput {...props} />;
  } else if (isStringArrayArgument(arg)) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
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
  proveOptions?: ProveOptions;
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
      <input value={arg.value} onChange={onChange} disabled={true} />
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
      <input value={arg.value} onChange={onChange} disabled={true} />
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
      <ArgWrapper>
        <Typography fontWeight={700} color="var(--text-tertiary)" fontSize={14}>
          {arg.displayName?.toUpperCase()}
        </Typography>
        <Input value={arg.value ?? ""} onChange={onChange} disabled={true} />
      </ArgWrapper>
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
          disabled={true}
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

  const load = useCallback(async (remoteUrl: string) => {
    console.log(`loading ${remoteUrl}`);
    const res = await fetch(remoteUrl);
    const result = await res.json();
    console.log(`loaded ${remoteUrl}:`, result);
    return result;
  }, []);

  useEffect(() => {
    if (arg.remoteUrl && !loaded) {
      setLoading(true);
      load(arg.remoteUrl)
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
      <ArgWrapper>
        <Typography fontWeight={700} color="var(--text-tertiary)" fontSize={14}>
          {arg.displayName?.toUpperCase()}
        </Typography>
        <TextareaInput
          value={JSON.stringify(arg.value, null, 2)}
          onChange={onChange}
          disabled={true}
        />
      </ArgWrapper>
    </ArgContainer>
  );
}

function ToggleListArgInput({
  arg,
  setArg,
  ...rest
}: ArgInputProps<ToogleListArgument<ToggleList>>): JSX.Element {
  const type = isRevealListArgument(arg) ? "reveal" : "default";
  const ref = useRef<AccordionRef>(null);
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
          return value ? (
            <EyeIcon width={18} height={18} />
          ) : (
            <EyeSlashIcon color="var(--text-tertiary)" width={18} height={18} />
          );

        default:
          return undefined;
      }
    },
    [type]
  );

  const entries = useMemo(
    () =>
      Object.entries(arg.value as unknown as ArrayLike<boolean>).filter(
        ([_key, value]) => {
          return value;
        }
      ),
    [arg.value]
  );

  useEffect(() => {
    ref.current?.open();
  }, []);

  return (
    <ArgContainer arg={arg} {...rest}>
      {!!entries.length && (
        <Accordion
          ref={ref}
          title={arg.displayName || "revealed information"}
          children={entries.map(([key, value]) => {
            return {
              title: getLabel(key),
              icon: getIcon(value),
              onClick: arg.userProvided
                ? (): void => setArg({ ...arg.value, [key]: !value })
                : undefined,
              key
            };
          })}
        />
      )}
    </ArgContainer>
  );
}

export function PCDArgInput({
  arg,
  setArg,
  isValid,
  proveOptions,
  ...rest
}: ArgInputProps<PCDArgument>): JSX.Element {
  const pcdCollection = usePCDCollection();
  const ref = useRef<AccordionRef>(null);
  const dispatch = useDispatch();
  const [loaded, setLoaded] = useState(false);
  const proveState = useProveState();
  const relevantPCDs = useMemo(
    () =>
      pcdCollection
        .getAll()
        .filter((pcd) => isValid(pcd) && pcd.type === arg.pcdType),
    [pcdCollection, isValid, arg]
  );

  useEffect(() => {
    const updateProveState = proveState === undefined || proveState;
    if (loaded || !updateProveState) return;
    console.log(arg.displayName, proveState);
    dispatch({
      type: "prove-state",
      eligible: relevantPCDs.length > 0
    });
    setLoaded(true);
  }, [arg, loaded, relevantPCDs, dispatch, proveState]);

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
          label: pcdPackage?.getDisplayOptions?.(pcd)?.displayName ?? pcd.type
        };
      }),
    [relevantPCDs, pcdCollection]
  );
  const onChange = useCallback(
    (option: SingleValue<Option>) => {
      if (option) {
        setPCDById(option.id);
      }
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

  useEffect(() => {
    if (
      arg.pcdType === EdDSATicketPCDTypeName ||
      arg.pcdType === PODTicketPCDTypeName
    ) {
      ref.current?.open();
    }
  }, [arg]);

  if (proveOptions?.multi) {
    return (
      <ArgContainer
        arg={arg}
        {...rest}
        error={
          relevantPCDs.length === 0
            ? arg.validatorParams?.notFoundMessage ??
              "You do not have an eligible PCD."
            : undefined
        }
      >
        <Accordion
          ref={ref}
          children={options.map((option) => {
            return {
              title: option.label,
              key: option.id
            };
          })}
          title={arg.displayName ?? "tickets"}
        />
      </ArgContainer>
    );
  }

  return (
    <ArgContainer
      arg={arg}
      {...rest}
      error={
        relevantPCDs.length === 0
          ? arg.validatorParams?.notFoundMessage ??
            "You do not have an eligible PCD."
          : undefined
      }
    >
      {!!relevantPCDs.length && (
        <SelectContainer>
          <Typography
            style={{ paddingTop: 12, paddingLeft: 12 }}
            fontWeight={700}
            fontSize={14}
            color="var(--text-tertiary)"
          >
            {arg.displayName?.toUpperCase() ?? "TICKETS"}
          </Typography>
          <Select
            value={options.find((option) => option.id === pcd?.id)}
            options={options}
            onChange={onChange}
          />
        </SelectContainer>
      )}
    </ArgContainer>
  );
}

const SelectContainer = styled.div`
  border-radius: 8px;
  border: 1px solid #eceaf4;
  background: #f6f8fd;
  display: flex;
  padding: 4px;
  gap: 8px;
  flex-direction: column;
`;

function ArgContainer({
  hidden,
  error,
  children
}: {
  arg: Argument<PrimitiveArgumentTypeName, unknown>;
  hidden?: boolean;
  error?: string;
  children?: React.ReactNode;
  /* optional element place at the end */
  end?: React.ReactNode;
}): JSX.Element {
  return (
    <ArgItemContainer hidden={hidden ?? false} error={!!error}>
      {children}
      {error && <ErrorText>{error}</ErrorText>}
    </ArgItemContainer>
  );
}
const ArgItemContainer = styled.div<{ hidden: boolean; error: boolean }>`
  width: 100%;
  display: ${({ hidden }): string => (hidden ? "none" : "")};
`;
const ArgsContainer = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  margin-bottom: 8px;
`;

const ErrorText = styled.div`
  color: var(--danger-bright);
  font-size: 14px;
`;

const TextareaInput = styled.textarea`
  width: 100%;
  height: 4em;
  background-color: #fff;
  border: 1px solid #eceaf4;
  color: var(--text-primary);
  resize: vertical;
  font:
    14px PlexSans,
    system-ui,
    sans-serif;

  &:disabled {
    opacity: 0.5;
  }
`;

const ShowMoreButtonInnerContainer = styled.div`
  display: flex;
  flex-direction: row;
  gap: 4px;
`;

const ArgsInnerContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 50vh;
  overflow: scroll;
  margin-bottom: 24px;
`;

const ArgWrapper = styled.div`
  border-radius: 8px;
  border: 1px solid #eceaf4;
  background: #f6f8fd;
  padding: 4px;
  padding-left: 12px;
`;
const Input = styled.input`
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.05);
  background: #fff;
  padding: 8px 4px;
  width: 100%;
`;
