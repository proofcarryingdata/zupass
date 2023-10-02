import zxcvbn from "zxcvbn";

// Must not be "too guessable", "very guessable", or "somewhat guessable"
export const MINIMUM_PASSWORD_STRENGTH = 2;

export const checkPasswordStrength = (password: string): boolean => {
  const { score } = zxcvbn(password);
  return score >= MINIMUM_PASSWORD_STRENGTH;
};

export const PASSWORD_MINIMUM_LENGTH = 8;
