import { Dispatch, FormEvent, SetStateAction, useState } from "react";
import styled from "styled-components";
import {
  PASSWORD_MINIMUM_LENGTH,
  checkPasswordStrength
} from "../../src/password";
import { BigInput, Button, Spacer } from "../core";
import { ErrorMessage } from "../core/error";
import { icons } from "../icons";

interface SetPasswordInputProps {
  value: string;
  setValue: Dispatch<SetStateAction<string>>;
  revealPassword: boolean;
  setRevealPassword: Dispatch<SetStateAction<boolean>>;
  placeholder: string;
  autoFocus?: boolean;
}

export function PasswordInput({
  value,
  setValue,
  revealPassword,
  autoFocus,
  setRevealPassword,
  placeholder
}: SetPasswordInputProps) {
  return (
    <Container>
      <PasswordBigInput
        autoFocus={autoFocus}
        type={revealPassword ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <ShowHidePasswordIconContainer>
        <ShowHidePasswordIcon
          draggable="false"
          src={revealPassword ? icons.eyeClosed : icons.eyeOpen}
          width={32}
          height={32}
          onClick={() => setRevealPassword((curr) => !curr)}
        />
      </ShowHidePasswordIconContainer>
    </Container>
  );
}

const PasswordBigInput = styled(BigInput)`
  /* To account for show/hide password icon. We add it to both sides to preserve center text alignment. */
  padding-right: 48px;
  padding-left: 48px;
`;

const Container = styled.div`
  width: 100%;
  position: relative;
`;

const ShowHidePasswordIconContainer = styled.div`
  position: absolute;
  right: 12px;
  height: 100%;
  display: flex;
  align-items: center;
  top: 0;
`;

const ShowHidePasswordIcon = styled.img`
  cursor: pointer;
`;

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
