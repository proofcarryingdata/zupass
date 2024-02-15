export type PODName = string;

export type PODStringValue = {
  type: "string";
  value: string;
};

export type PODCryptographicValue = {
  type: "cryptographic";
  value: bigint;
};

export type PODIntValue = {
  type: "int";
  value: bigint;
};

export type PODValue = PODStringValue | PODCryptographicValue | PODIntValue;

export type PODEntries = Record<PODName, PODValue>;

export type PODMap = Map<PODName, PODValue>;
