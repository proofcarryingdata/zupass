import { Dispatch, FormEvent, SetStateAction, useState } from "react";
import {
  PASSWORD_MINIMUM_LENGTH,
  checkPasswordStrength
} from "../../src/password";
import { Button, Spacer } from "../core";
import { ErrorMessage } from "../core/error";
import { PasswordInput } from "./PasswordInput";

interface NewPasswordForm {
  email: string; // As a hidden element for autofill
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
}

export function NewPasswordForm({
  email,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  revealPassword,
  setRevealPassword,
  onSuccess,
  submitButtonText,
  passwordInputPlaceholder,
  autoFocus
}: NewPasswordForm) {
  const [passwordError, setErrorMessage] = useState("");

  const checkPasswordAndSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (password === "") {
      setErrorMessage("Please enter a password.");
    } else if (password.length < PASSWORD_MINIMUM_LENGTH) {
      setErrorMessage(
        `Password must be at least ${PASSWORD_MINIMUM_LENGTH} characters.`
      );
    } else if (!checkPasswordStrength(password)) {
      // Inspired by Dashlane's zxcvbn guidance:
      // https://www.dashlane.com/blog/dashlanes-new-zxcvbn-guidance-helps-you-create-stronger-master-passwords-and-eliminates-the-guessing-game
      setErrorMessage(
        "Password is too weak. Try adding another word or two. Uncommon words are better."
      );
    } else if (confirmPassword === "") {
      setErrorMessage("Please confirm your password.");
    } else if (password !== confirmPassword) {
      setErrorMessage("Your passwords do not match.");
    } else {
      onSuccess();
    }
    return;
  };

  return (
    <form onSubmit={checkPasswordAndSubmit}>
      {/* For password manager autofill */}
      <input hidden readOnly value={email} />
      <PasswordInput
        value={password}
        setValue={(value) => {
          setErrorMessage("");
          setPassword(value);
        }}
        placeholder={passwordInputPlaceholder || "Password"}
        autoFocus={autoFocus}
        revealPassword={revealPassword}
        setRevealPassword={setRevealPassword}
      />
      <Spacer h={8} />
      <PasswordInput
        value={confirmPassword}
        setValue={(value) => {
          setErrorMessage("");
          setConfirmPassword(value);
        }}
        placeholder="Confirm password"
        revealPassword={revealPassword}
        setRevealPassword={setRevealPassword}
      />
      <Spacer h={8} />
      {passwordError && <ErrorMessage>{passwordError}</ErrorMessage>}
      <Spacer h={16} />
      <Button style="primary" type="submit">
        {submitButtonText}
      </Button>
    </form>
  );
}
