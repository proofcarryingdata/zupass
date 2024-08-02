import { Dispatch, SetStateAction, UIEvent, useRef } from "react";
import {
  PASSWORD_MINIMUM_LENGTH,
  checkPasswordStrength
} from "../../src/password";
import { Button, Spacer } from "../core";
import { InlineError } from "./InlineError";
import { PasswordInput } from "./PasswordInput";

interface NewPasswordForm {
  emails: string[]; // As a hidden element for autofill
  password: string;
  setPassword: Dispatch<SetStateAction<string>>;
  confirmPassword: string;
  setConfirmPassword: Dispatch<SetStateAction<string>>;
  revealPassword: boolean;
  setRevealPassword: Dispatch<SetStateAction<boolean>>;
  onSuccess: () => void;
  submitButtonText: string;
  passwordInputPlaceholder?: string; // Override placeholder on the first input
  autoFocus?: boolean;
  setError: Dispatch<SetStateAction<string | undefined>>;
  error?: string;
}

export function NewPasswordForm({
  emails,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  revealPassword,
  setRevealPassword,
  onSuccess,
  submitButtonText,
  passwordInputPlaceholder,
  autoFocus,
  setError,
  error
}: NewPasswordForm): JSX.Element {
  const confirmPasswordRef = useRef<HTMLInputElement>(null);

  const checkPasswordAndSubmit = (e: UIEvent): void => {
    e.preventDefault();
    if (password === "") {
      setError("Enter a password");
    } else if (password.length < PASSWORD_MINIMUM_LENGTH) {
      setError(
        `Password must be at least ${PASSWORD_MINIMUM_LENGTH} characters.`
      );
    } else if (!window.zxcvbn) {
      setError(
        "Background libraries have not loaded yet. Please retry in a few seconds."
      );
    } else if (!checkPasswordStrength(password)) {
      // Inspired by Dashlane's zxcvbn guidance:
      // https://www.dashlane.com/blog/dashlanes-new-zxcvbn-guidance-helps-you-create-stronger-master-passwords-and-eliminates-the-guessing-game
      setError(
        "Password is too weak. Try adding another word or two. Uncommon words are better."
      );
    } else if (confirmPassword === "") {
      setError("Confirm your password");
    } else if (password !== confirmPassword) {
      setError("Passwords don't match");
    } else {
      onSuccess();
    }
    return;
  };

  return (
    <form>
      {/* For password manager autofill */}
      <input hidden readOnly value={emails[0]} />
      <PasswordInput
        value={password}
        setValue={(value): void => {
          setError("");
          setPassword(value);
        }}
        placeholder={passwordInputPlaceholder || "Password"}
        onEnter={(e): void => {
          e.preventDefault();
          confirmPasswordRef?.current?.focus();
        }}
        showStrengthProgress
        autoFocus={autoFocus}
        revealPassword={revealPassword}
        setRevealPassword={setRevealPassword}
      />
      <Spacer h={8} />
      <PasswordInput
        inputRef={confirmPasswordRef}
        onEnter={checkPasswordAndSubmit}
        value={confirmPassword}
        setValue={(value): void => {
          setError("");
          setConfirmPassword(value);
        }}
        placeholder="Confirm password"
        revealPassword={revealPassword}
        setRevealPassword={setRevealPassword}
      />
      <InlineError error={error} />
      <Spacer h={8} />
      <Button style="primary" onClick={checkPasswordAndSubmit}>
        {submitButtonText}
      </Button>
    </form>
  );
}
