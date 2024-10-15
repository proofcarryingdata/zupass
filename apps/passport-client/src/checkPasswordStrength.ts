import zxcvbn from "zxcvbn";
import { PasswordStrength } from "./password";

export const checkPasswordStrength = (password: string): boolean => {
  const { score } = zxcvbn(password);
  return score >= PasswordStrength.STRONG;
};
