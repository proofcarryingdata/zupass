export type InputValue = string | bigint | boolean | Date;
export type InputRow = Record<string, InputValue>;

export interface Input {
  getRows(): Promise<InputRow[]>;
}
