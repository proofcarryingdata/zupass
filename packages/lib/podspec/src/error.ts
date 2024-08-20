import { PODValue } from "@pcd/pod";

export enum IssueCode {
  invalid_type = "invalid_type",
  not_in_list = "not_in_list",
  excluded_by_list = "excluded_by_list",
  not_in_range = "not_in_range",
  missing_entry = "missing_entry",
  invalid_entry_name = "invalid_entry_name",
  invalid_tuple_entry = "invalid_tuple_entry",
  not_in_tuple_list = "not_in_tuple_list",
  excluded_by_tuple_list = "excluded_by_tuple_list",
  invalid_signer = "invalid_signer",
  invalid_pod_value = "invalid_pod_value"
}

export interface PodspecBaseIssue {
  message?: string;
  path: (string | number)[];
  code: IssueCode;
}

export interface PodspecInvalidTypeIssue extends PodspecBaseIssue {
  code: IssueCode.invalid_type;
  expectedType: string;
  actualType: string;
}

export interface PodspecNotInListIssue extends PodspecBaseIssue {
  code: IssueCode.not_in_list;
  value: PODValue["value"];
  list: PODValue["value"][];
}

export interface PodspecExcludedByListIssue extends PodspecBaseIssue {
  code: IssueCode.excluded_by_list;
  value: PODValue["value"];
  list: PODValue["value"][];
}

export interface PodspecNotInRangeIssue extends PodspecBaseIssue {
  code: IssueCode.not_in_range;
  value: bigint;
  min: bigint;
  max: bigint;
}

export interface PodspecMissingEntryIssue extends PodspecBaseIssue {
  code: IssueCode.missing_entry;
  key: string;
}

export interface PodspecInvalidEntryNameIssue extends PodspecBaseIssue {
  code: IssueCode.invalid_entry_name;
  name: string;
  description: string;
}

export interface PodspecInvalidTupleEntryIssue extends PodspecBaseIssue {
  code: IssueCode.invalid_tuple_entry;
  name: string;
}

export interface PodspecNotInTupleListIssue extends PodspecBaseIssue {
  code: IssueCode.not_in_tuple_list;
  value: PODValue[];
  list: PODValue[][];
}

export interface PodspecExcludedByTupleListIssue extends PodspecBaseIssue {
  code: IssueCode.excluded_by_tuple_list;
  value: PODValue[];
  list: PODValue[][];
}

export interface PodspecInvalidSignerIssue extends PodspecBaseIssue {
  code: IssueCode.invalid_signer;
  signer: string;
  list: string[];
}

export interface PodspecInvalidPodValueIssue extends PodspecBaseIssue {
  code: IssueCode.invalid_pod_value;
  value: PODValue;
  reason: string;
}

export type PodspecIssue =
  | PodspecInvalidTypeIssue
  | PodspecNotInListIssue
  | PodspecExcludedByListIssue
  | PodspecNotInRangeIssue
  | PodspecMissingEntryIssue
  | PodspecInvalidEntryNameIssue
  | PodspecInvalidTupleEntryIssue
  | PodspecNotInTupleListIssue
  | PodspecExcludedByTupleListIssue
  | PodspecInvalidSignerIssue
  | PodspecInvalidPodValueIssue;

export class PodspecError extends Error {
  issues: PodspecBaseIssue[] = [];

  public get errors(): PodspecBaseIssue[] {
    return this.issues;
  }

  constructor(issues: PodspecBaseIssue[]) {
    super();
    this.name = "PodspecError";
    this.issues = issues;
  }
}
