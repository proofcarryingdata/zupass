import { Dispatch, ReactNode, SetStateAction, useRef, useState } from "react";
import styled from "styled-components";
import { checkPasswordStrength } from "../../../src/checkPasswordStrength";
import { PASSWORD_MINIMUM_LENGTH } from "../../../src/password";
import { Button2 } from "../Button";
import { NewLoader } from "../NewLoader";
import { Typography } from "../Typography";
import { PasswordInput2 } from "./PasswordInput2";

interface NewPasswordForm {
  loading: boolean;
  emails: string[]; // As a hidden element for autofill
  password: string;
  setPassword: Dispatch<SetStateAction<string>>;
  confirmPassword: string;
  setConfirmPassword: Dispatch<SetStateAction<string>>;
  currentPassword?: string;
  setCurrentPassword?: Dispatch<SetStateAction<string>>;
  isChangePassword?: boolean;
  onSuccess: () => void;
  onCancel: () => void;
  submitButtonText: string;
  revealPassword: boolean;
  setRevealPassword: Dispatch<SetStateAction<boolean>>;
  passwordInputPlaceholder?: string; // Override placeholder on the first input
  autoFocus?: boolean;
  setError: Dispatch<SetStateAction<string | undefined>>;
  error?: string;
  showSkipConfirm?: boolean;
  onSkipConfirm?: () => void;
  style?: React.CSSProperties;
}

export const NewPasswordForm2 = ({
  loading,
  emails,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  currentPassword,
  setCurrentPassword,
  isChangePassword,
  onSuccess,
  onCancel,
  submitButtonText,
  passwordInputPlaceholder,
  autoFocus,
  setError,
  error,
  showSkipConfirm,
  onSkipConfirm,
  style
}: NewPasswordForm): JSX.Element => {
  const confirmPasswordRef = useRef<HTMLInputElement>(null);
  const [showPassword, setShowPassword] = useState(false);
  const togglePassword = () => setShowPassword((prev) => !prev);

  const checkPasswordAndSubmit = (e?: React.FormEvent): void => {
    if (e) {
      e.preventDefault();
    }
    if (password === "") {
      setError("Enter a password");
    } else if (password.length < PASSWORD_MINIMUM_LENGTH) {
      setError(
        `Password must be at least ${PASSWORD_MINIMUM_LENGTH} characters.`
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

  const textOrLoader = (text: string): ReactNode => {
    if (loading) return <NewLoader columns={3} rows={2} color="white" />;

    return (
      <Typography color="inherit" fontSize={18} fontWeight={500} family="Rubik">
        {text}
      </Typography>
    );
  };
  const getErrorMessage = (
    inputType: "password" | "confirm" | "change"
  ): string | undefined => {
    if (!error) return undefined;
    const errors: Record<string, "password" | "confirm" | "change"> = {
      "Password must be at least 8 characters.": "password",
      "Passwords don't match": "confirm",
      "Error occurred while fetching salt from server": "change",
      "Incorrect password. If you've lost your password, reset your account below.":
        "change"
    };

    if (errors[error] === inputType) return error;
    else if (!errors[error] && inputType === "password") return error;
    return undefined;
  };

  return (
    <PasswordForm onSubmit={checkPasswordAndSubmit} style={style}>
      {/* For password manager autofill */}
      <input hidden readOnly value={emails[0]} />
      <InputsContainer>
        {isChangePassword && (
          <PasswordInput2
            autoFocus={true}
            value={currentPassword}
            onChange={({ target: { value } }): void => {
              setError("");
              setCurrentPassword?.(value);
            }}
            placeholder="Current password"
            error={getErrorMessage("change")}
            variant="secondary"
            showPassword={showPassword}
            onTogglePassword={togglePassword}
          />
        )}
        <PasswordInput2
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
          showPassword={showPassword}
          onTogglePassword={togglePassword}
        />
        <PasswordInput2
          ref={confirmPasswordRef}
          value={confirmPassword}
          onChange={({ target: { value } }): void => {
            setError("");
            setConfirmPassword(value);
          }}
          placeholder="Confirm password"
          error={getErrorMessage("confirm")}
          variant="secondary"
          showPassword={showPassword}
          onTogglePassword={togglePassword}
        />
      </InputsContainer>
      <InputsContainer>
        <Button2 type="submit" disabled={!!error || loading}>
          {textOrLoader(submitButtonText)}
        </Button2>
        <Button2 type="button" onClick={onCancel} variant="secondary">
          Back
        </Button2>
        {showSkipConfirm && (
          <Button2 type="button" onClick={onSkipConfirm} variant="danger">
            Skip for now
          </Button2>
        )}
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
