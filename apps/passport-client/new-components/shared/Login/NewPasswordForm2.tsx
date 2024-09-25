import { Dispatch, SetStateAction, UIEvent, useRef } from "react";
import styled from "styled-components";
import { useDispatch } from "../../../src/appHooks";
import {
  PASSWORD_MINIMUM_LENGTH,
  checkPasswordStrength
} from "../../../src/password";
import { Button2 } from "../Button";
import { Input2 } from "../Input";

interface NewPasswordForm {
  loading: boolean;
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

export const NewPasswordForm2 = ({
  loading,
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
}: NewPasswordForm): JSX.Element => {
  const dispatch = useDispatch();
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

  const getErrorMessage = (
    inputType: "password" | "confirm"
  ): string | undefined => {
    if (!error) return undefined;
    const errors: Record<string, "password" | "confirm"> = {
      "Password must be at least 8 characters.": "password",
      "Passwords don't match": "confirm"
    };

    if (errors[error] === inputType) return error;
    else if (!errors[error] && inputType === "password") return error;
    return undefined;
  };

  return (
    <PasswordForm>
      {/* For password manager autofill */}
      <input hidden readOnly value={emails[0]} />
      <InputsContainer>
        <Input2
          value={password}
          onChange={({ target: { value } }): void => {
            setError("");
            setPassword(value);
          }}
          placeholder={passwordInputPlaceholder || "Password"}
          onKeyUp={(e): void => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            confirmPasswordRef?.current?.focus();
          }}
          autoFocus={autoFocus}
          error={getErrorMessage("password")}
          variant="secondary"
          type="password"
        />
        <Input2
          ref={confirmPasswordRef}
          value={confirmPassword}
          onChange={({ target: { value } }): void => {
            setError("");
            setConfirmPassword(value);
          }}
          placeholder="Confirm password"
          error={getErrorMessage("confirm")}
          variant="secondary"
          type="password"
        />
      </InputsContainer>
      <InputsContainer>
        <Button2 onClick={checkPasswordAndSubmit} disabled={!!error || loading}>
          {submitButtonText}
        </Button2>
        <Button2
          onClick={() => {
            dispatch({
              type: "set-bottom-modal",
              modal: {
                modalType: "settings"
              }
            });
          }}
          variant="secondary"
        >
          Back
        </Button2>
      </InputsContainer>
    </PasswordForm>
  );
};

const PasswordForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const InputsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;
