export type InputValue = string | number | boolean | Date;
export type InputRow = Record<string, InputValue>;

export interface Input {
  getRows(): Promise<InputRow[]>;
}
